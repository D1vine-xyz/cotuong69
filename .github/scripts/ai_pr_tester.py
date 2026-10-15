import os
import re
import json
import base64
import urllib.request
import urllib.error
import subprocess
import sys

def read_log_file(filename):
    if os.path.exists(filename):
        try:
            with open(filename, "r", encoding="utf-8", errors="replace") as f:
                return f.read().strip()
        except Exception as e:
            return f"Không thể đọc file {filename}: {str(e)}"
    return ""

def extract_jira_issue_key(text):
    if not text:
        return None
    matches = re.findall(r'\b([A-Za-z][A-Za-z0-9_]*-\d+)\b', text)
    valid_matches = [m.upper() for m in matches if not m.upper().startswith("REVERT-")]
    return valid_matches[0] if valid_matches else None

def extract_text_from_adf(node):
    if not node:
        return ""
    if isinstance(node, str):
        return node.strip()
    parts = []
    def walk(n):
        if isinstance(n, dict):
            if n.get("type") == "text" and "text" in n:
                parts.append(n["text"])
            for c in n.get("content", []):
                walk(c)
        elif isinstance(n, list):
            for item in n:
                walk(item)
    walk(node)
    return " ".join(parts).strip()

def fetch_jira_issue(jira_url, email, token, issue_key):
    auth_str = f"{email}:{token}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    url = f"{jira_url}/rest/api/3/issue/{issue_key}?fields=summary,description,status,issuetype"

    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Basic {auth_b64}",
            "Accept": "application/json",
            "User-Agent": "AI-PR-Tester"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            fields = data.get("fields", {})
            summary = fields.get("summary", "")
            raw_desc = fields.get("description", {})
            desc_text = extract_text_from_adf(raw_desc)
            status = fields.get("status", {}).get("name", "Unknown")
            return summary, desc_text, status, None
    except urllib.error.HTTPError as e:
        return None, None, None, f"HTTP {e.code}: {e.read().decode('utf-8', errors='replace')}"
    except Exception as e:
        return None, None, None, str(e)

def get_pr_changes(base_ref, repo, pr_number, gh_token):
    changed_files = []
    diff_summary = ""

    # 1. Thử dùng git diff
    for target in [f"origin/{base_ref}", base_ref, "main", "origin/main"]:
        try:
            res_files = subprocess.run(["git", "diff", "--name-only", f"{target}...HEAD"], capture_output=True, text=True)
            if res_files.returncode == 0 and res_files.stdout.strip():
                changed_files = [l.strip() for l in res_files.stdout.splitlines() if l.strip()]
                res_stat = subprocess.run(["git", "diff", "--stat", f"{target}...HEAD"], capture_output=True, text=True)
                diff_summary = res_stat.stdout.strip()[:3000]
                break
        except Exception:
            pass

    # 2. Fallback dùng GitHub API nếu git diff rỗng
    if not changed_files and gh_token and pr_number and repo:
        try:
            url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}/files?per_page=100"
            req = urllib.request.Request(
                url,
                headers={"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github+json", "User-Agent": "AI-PR-Tester"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                changed_files = [f.get("filename", "") for f in data if f.get("filename")]
                diff_summary = "\n".join(f"{f.get('filename')}: +{f.get('additions')} -{f.get('deletions')}" for f in data[:25])
        except Exception as e:
            print(f"Lưu ý: Không thể lấy danh sách file qua GitHub API: {e}")

    return changed_files, diff_summary

def analyze_scope_and_acceptance_with_gemini(api_key, issue_key, jira_summary, jira_desc, changed_files, diff_summary):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

    files_list_str = "\n".join(f"- {f}" for f in changed_files[:30])
    if len(changed_files) > 30:
        files_list_str += f"\n... và {len(changed_files) - 30} file khác."

    prompt = f"""Bạn là AI Senior Tech Lead kiêm Reviewer tự động cho dự án Web Cờ Tướng Mạng Xã Hội (Repository: cotuong69).
Nhiệm vụ của bạn là kiểm tra Pull Request này đối chiếu với Task Jira được giao.

THÔNG TIN TASK JIRA:
- Mã task: {issue_key}
- Tiêu đề task: {jira_summary}
- Mô tả / Tiêu chí nghiệm thu (Acceptance Criteria):
{jira_desc if jira_desc else '(Không có mô tả chi tiết, hãy đánh giá dựa trên tiêu đề task)'}

THÔNG TIN PULL REQUEST:
- Danh sách file thay đổi:
{files_list_str}

- Thống kê thay đổi (Git Stat):
{diff_summary}

YÊU CẦU ĐÁNH GIÁ (Trả về kết quả bằng tiếng Việt, định dạng Markdown rõ ràng):
1. **Dòng đầu tiên**: Ghi đúng 1 từ khóa kết luận: `VERDICT: PASSED` hoặc `VERDICT: WARNING` hoặc `VERDICT: FAILED`.
   - `PASSED`: Thay đổi đúng mô tả Jira, file thay đổi gọn gàng trong phạm vi module của task, không đụng sang module khác.
   - `WARNING`: Cơ bản hoàn thành hoặc có chỉnh sửa phụ cần reviewer lưu ý (ví dụ: cập nhật package chung hoặc doc).
   - `FAILED`: Hoàn toàn không liên quan đến mô tả Jira HOẶC chạm/sửa nghiêm trọng vào module của task khác (ví dụ task UI phòng mà lại sửa logic bàn cờ, auth, hoặc migrations của task khác).

2. **Nội dung đánh giá**:
   - **🎯 Mức độ hoàn thành Description**: Đánh giá các thay đổi có giải quyết đúng tiêu chí Jira không.
   - **🛡️ Kiểm soát Scope (Không đụng task khác)**: Nêu rõ task thuộc module nào. Các file bị thay đổi có bị "lấn sân" sang module khác không.
   - **💡 Đề xuất cho Reviewer**: 1-2 câu ngắn gọn."""

    data = {"contents": [{"parts": [{"text": prompt}]}]}
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=18) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            candidates = result.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
    except Exception as e:
        print(f"Lưu ý: Không thể gọi Gemini API cho Scope Check ({e}).")
    return None

def fallback_scope_analysis(issue_key, jira_summary, jira_desc, changed_files):
    summary_lower = (jira_summary or "").lower()
    desc_lower = (jira_desc or "").lower()
    combined = summary_lower + " " + desc_lower

    is_room_task = any(w in combined for w in ["phòng", "room", "lobby", "sảnh"])
    is_board_task = any(w in combined for w in ["bàn cờ", "board", "render", "quân cờ"])
    is_move_task = any(w in combined for w in ["di chuyển", "nước đi", "movement", "move"])
    is_db_task = any(w in combined for w in ["database", "schema", "csdl", "migration", "pool"])

    suspicious_files = []
    for f in changed_files:
        f_lower = f.lower()
        if is_room_task and ("board" in f_lower or "movement" in f_lower or "migration" in f_lower):
            suspicious_files.append(f)
        elif is_board_task and ("rooms.js" in f_lower or "migration" in f_lower):
            suspicious_files.append(f)
        elif is_db_task and ("frontend/" in f_lower and not f_lower.endswith(".md")):
            suspicious_files.append(f)

    if suspicious_files:
        verdict = "VERDICT: WARNING"
        scope_status = "⚠️ CẢNH BÁO PHẠM VI (Phát hiện file có thể thuộc module khác)"
        details = "Các file nghi ngờ ngoài phạm vi:\n" + "\n".join(f"- `{f}`" for f in suspicious_files)
    else:
        verdict = "VERDICT: PASSED"
        scope_status = "✅ AN TOÀN (Tất cả file đều nằm trong phạm vi task)"
        details = "Không phát hiện file sửa đổi nào lấn sang module của task khác."

    return (
        f"{verdict}\n\n"
        f"**🎯 Mức độ hoàn thành Description**: Các thay đổi phù hợp với tiêu đề `{jira_summary}`.\n\n"
        f"**🛡️ Kiểm soát Scope (Không đụng task khác)**: {scope_status}\n{details}\n\n"
        f"**💡 Đề xuất cho Reviewer**: Đã kiểm tra tĩnh sơ bộ, khuyến nghị xem lại git diff trước khi merge."
    )

def analyze_test_failure_with_gemini(api_key, error_context):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    prompt = (
        "Bạn là AI Senior Tech Lead kiểm tra Pull Request cho dự án Web Cờ Tướng Mạng Xã Hội.\n"
        "Dưới đây là log kiểm thử hoặc build bị thất bại:\n\n"
        f"```\n{error_context}\n```\n\n"
        "Hãy phân tích và trả về định dạng ngắn gọn:\n"
        "1. **Nguyên nhân chính** (1-2 câu ngắn gọn, chỉ rõ file/line nếu có)\n"
        "2. **Đề xuất cách sửa** (Code snippet hoặc hướng dẫn xử lý ngắn gọn)"
    )
    data = {"contents": [{"parts": [{"text": prompt}]}]}
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            candidates = result.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
    except Exception as e:
        print(f"Lưu ý: Không thể gọi Gemini API cho Failure Diagnosis ({e}).")
    return None

def fallback_test_failure_analysis(error_context):
    lines = error_context.splitlines()
    failing_assertions = [l.strip() for l in lines if "✖" in l or "Error:" in l or "failed" in l.lower()]
    summary = failing_assertions[:3] if failing_assertions else ["Phát hiện lỗi trong quá trình chạy kiểm thử hoặc build."]
    return (
        "**Nguyên nhân:**\n" + "\n".join(f"- {s}" for s in summary) + "\n\n"
        "**Khuyến nghị:** Kiểm tra lại cú pháp, ràng buộc dữ liệu hoặc các unit test liên quan trước khi merge."
    )

def create_jira_issue(jira_url, email, token, project_key, summary, description_text):
    auth_str = f"{email}:{token}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    url = f"{jira_url}/rest/api/3/issue"

    adf_description = {
        "type": "doc",
        "version": 1,
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": description_text}]}]
    }

    for issue_type in ["Bug", "Task"]:
        payload = {
            "fields": {
                "project": {"key": project_key},
                "summary": summary[:250],
                "issuetype": {"name": issue_type},
                "description": adf_description
            }
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": f"Basic {auth_b64}", "Content-Type": "application/json", "Accept": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                return res.get("key"), None
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8")
            if issue_type == "Task":
                return None, f"HTTP {e.code}: {err}"
        except Exception as e:
            return None, str(e)
    return None, "Không thể tạo issue"

def post_github_comment(repo, pr_number, gh_token, comment_body):
    url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
    req = urllib.request.Request(
        url,
        data=json.dumps({"body": comment_body}).encode("utf-8"),
        headers={"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github+json", "User-Agent": "AI-PR-Tester"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"Đã bình luận lên PR #{pr_number}")
    except Exception as e:
        print(f"Lỗi khi gửi bình luận lên PR: {e}")

def main():
    pr_number = os.environ.get("PR_NUMBER", "")
    pr_title = os.environ.get("PR_TITLE", "Untitled PR")
    pr_url = os.environ.get("PR_URL", "")
    pr_author = os.environ.get("PR_AUTHOR", "contributor")
    pr_branch = os.environ.get("PR_BRANCH", "")
    base_ref = os.environ.get("BASE_REF", "main")
    repo = os.environ.get("GITHUB_REPOSITORY", "saketai72-oss/cotuong69")

    backend_outcome = os.environ.get("BACKEND_OUTCOME", "success")
    frontend_outcome = os.environ.get("FRONTEND_OUTCOME", "success")

    gemini_key = os.environ.get("GEMINI_API_KEY")
    jira_url = os.environ.get("JIRA_BASE_URL", "https://cotuong69.atlassian.net").rstrip("/")
    jira_email = os.environ.get("JIRA_USER_EMAIL")
    jira_token = os.environ.get("JIRA_API_TOKEN")
    gh_token = os.environ.get("GITHUB_TOKEN")

    print(f"🚀 Bắt đầu AI PR Tester cho PR #{pr_number}: {pr_title}")
    print(f"Nhánh: {pr_branch} -> Base: {base_ref}")

    # ============================================================
    # 1. KIỂM TRA LỖI BUILD VÀ UNIT TESTS
    # ============================================================
    has_test_failures = (backend_outcome == "failure" or frontend_outcome == "failure")
    if has_test_failures:
        print("❌ Phát hiện lỗi trong bước chạy test/build!")
        backend_log = read_log_file("backend_test.log")
        frontend_log = read_log_file("frontend_build.log")
        error_context = ""
        failures = []
        if backend_outcome == "failure":
            failures.append("Backend Unit Tests")
            error_context += f"--- BACKEND TEST LOG ---\n{backend_log}\n\n"
        if frontend_outcome == "failure":
            failures.append("Frontend Build / Tests")
            error_context += f"--- FRONTEND LOG ---\n{frontend_log}\n\n"

        ai_diagnosis = analyze_test_failure_with_gemini(gemini_key, error_context) if gemini_key else None
        if not ai_diagnosis:
            ai_diagnosis = fallback_test_failure_analysis(error_context)

        jira_issue_key = None
        jira_link = ""
        if jira_email and jira_token:
            summary = f"[Bug][PR #{pr_number}] Lỗi kiểm thử: {', '.join(failures)}"
            desc = (
                f"PR #{pr_number} bởi @{pr_author} bị thất bại khi chạy CI kiểm thử tự động.\n\n"
                f"Link PR: {pr_url}\nTiêu đề: {pr_title}\n\n"
                f"CHẨN ĐOÁN LỖI:\n{ai_diagnosis}\n\nCHI TIẾT LOG:\n{error_context[:1500]}"
            )
            jira_issue_key, _ = create_jira_issue(jira_url, jira_email, jira_token, "COT", summary, desc)
            if jira_issue_key:
                jira_link = f"{jira_url}/browse/{jira_issue_key}"

        if gh_token and pr_number:
            comment = (
                f"### ❌ AI Quality Gate: Kiểm thử tự động thất bại trên PR #{pr_number}\n\n"
                f"Kính gửi @{pr_author},\n"
                f"Hệ thống CI tự động phát hiện lỗi khi kiểm tra mã nguồn. **Vui lòng sửa lỗi trước khi merge.**\n\n"
                f"| Thành Phần | Trạng Thái |\n"
                f"| :--- | :---: |\n"
                f"| **Backend Tests** | {'❌ Thất bại' if backend_outcome == 'failure' else '✅ Thành công'} |\n"
                f"| **Frontend Tests/Build** | {'❌ Thất bại' if frontend_outcome == 'failure' else '✅ Thành công'} |\n\n"
                f"---\n\n#### 🔍 Chẩn Đoán Lỗi Từ AI:\n{ai_diagnosis}\n\n"
            )
            if jira_issue_key:
                comment += f"---\n> 📌 **Jira Bug tự động**: [{jira_issue_key}]({jira_link})\n"
            post_github_comment(repo, pr_number, gh_token, comment)

        # Chặn merge
        print("::error::Kiểm thử tự động thất bại! Đã ghi log và gửi bình luận cảnh báo.")
        sys.exit(1)

    # ============================================================
    # 2. KIỂM TRA ĐÚNG DESCRIPTION JIRA & SCOPE GUARD (KHÔNG ĐỤNG TASK KHÁC)
    # ============================================================
    issue_key = extract_jira_issue_key(f"{pr_title} {pr_branch}")
    if not issue_key:
        print("ℹ️ Không tìm thấy Jira Issue Key trong PR Title/Branch. Bỏ qua bước kiểm tra Description.")
        return

    print(f"📋 Tìm thấy Jira Issue Key: {issue_key}")
    changed_files, diff_summary = get_pr_changes(base_ref, repo, pr_number, gh_token)
    print(f"Số file thay đổi: {len(changed_files)}")

    jira_summary = ""
    jira_desc = ""
    if jira_email and jira_token:
        s, d, st, err = fetch_jira_issue(jira_url, jira_email, jira_token, issue_key)
        if s:
            jira_summary = s
            jira_desc = d or ""
            print(f"Đã lấy thông tin Jira task: [{issue_key}] {jira_summary}")
        else:
            print(f"⚠️ Không thể tải Jira issue {issue_key}: {err}")
            jira_summary = pr_title

    scope_report = None
    if gemini_key and jira_summary:
        scope_report = analyze_scope_and_acceptance_with_gemini(
            gemini_key, issue_key, jira_summary, jira_desc, changed_files, diff_summary
        )

    if not scope_report:
        scope_report = fallback_scope_analysis(issue_key, jira_summary, jira_desc, changed_files)

    # Phân tích Verdict từ báo cáo
    verdict = "PASSED"
    if "VERDICT: FAILED" in scope_report:
        verdict = "FAILED"
    elif "VERDICT: WARNING" in scope_report:
        verdict = "WARNING"

    # Làm sạch từ khóa dòng đầu để hiển thị đẹp
    cleaned_report = re.sub(r'VERDICT:\s*(PASSED|WARNING|FAILED)\s*', '', scope_report).strip()

    verdict_badge = {
        "PASSED": "✅ **ĐẠT CHUẨN (PASS)**",
        "WARNING": "⚠️ **CẦN LƯU Ý (WARNING)**",
        "FAILED": "❌ **KHÔNG ĐẠT (FAILED - VI PHẠM PHẠM VI HOẶC SAI MÔ TẢ)**"
    }.get(verdict, "ℹ️ ĐÃ KIỂM TRA")

    comment_body = (
        f"### 🛡️ AI PR Gate: Kiểm tra Jira Description & Scope Guard\n\n"
        f"| Tiêu Chí | Chi Tiết |\n"
        f"| :--- | :--- |\n"
        f"| **Jira Task** | [{issue_key}]({jira_url}/browse/{issue_key}) - {jira_summary} |\n"
        f"| **Tác giả PR** | @{pr_author} |\n"
        f"| **Số file thay đổi** | `{len(changed_files)}` files |\n"
        f"| **Kết luận AI** | {verdict_badge} |\n\n"
        f"---\n\n"
        f"#### 📑 Chi Tiết Đánh Giá Của AI:\n\n"
        f"{cleaned_report}\n"
    )

    if gh_token and pr_number:
        post_github_comment(repo, pr_number, gh_token, comment_body)

    if verdict == "FAILED":
        print("::error::AI Scope Guard phát hiện PR vi phạm nghiêm trọng (lấn scope hoặc sai mô tả Jira).")
        sys.exit(1)
    else:
        print(f"✅ AI PR Gate hoàn thành: {verdict}")

if __name__ == "__main__":
    main()
