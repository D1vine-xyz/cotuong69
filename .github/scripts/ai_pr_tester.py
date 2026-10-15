#!/usr/bin/env python3
"""
AI PR Tester & Auto Issue Creator
- Phân tích log kiểm thử/build bị lỗi
- Dùng AI (Gemini API hoặc bộ phân tích tích hợp) để chẩn đoán nguyên nhân và đề xuất sửa lỗi
- Tự động tạo Issue (Bug) trên Jira
- Tự động bình luận chi tiết lên Pull Request trên GitHub để chặn merge
"""

import os
import sys
import json
import re
import base64
import urllib.request
import urllib.error

def read_log_file(path, max_chars=3000):
    if not os.path.exists(path):
        return ""
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            if len(content) > max_chars:
                return "...[truncated]...\n" + content[-max_chars:]
            return content
    except Exception as e:
        return f"Error reading log: {e}"

def analyze_with_gemini(api_key, error_context):
    """Gọi Gemini API để chẩn đoán lỗi chuyên sâu"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    prompt = (
        "Bạn là AI Senior Tech Lead kiểm tra Pull Request cho dự án Web Cờ Tướng Mạng Xã Hội.\n"
        "Dưới đây là log kiểm thử hoặc build bị thất bại:\n\n"
        f"```\n{error_context}\n```\n\n"
        "Hãy phân tích và trả về định dạng ngắn gọn:\n"
        "1. **Nguyên nhân chính** (1-2 câu ngắn gọn, chỉ rõ file/line nếu có)\n"
        "2. **Đề xuất cách sửa** (Code snippet hoặc hướng dẫn xử lý ngắn gọn)"
    )

    data = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            candidates = result.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
    except Exception as e:
        print(f"Lưu ý: Không thể gọi Gemini API ({e}), chuyển sang bộ phân tích tích hợp.")
    return None

def fallback_analysis(error_context):
    """Phân tích tĩnh dựa trên pattern regex khi không có AI Key"""
    lines = error_context.splitlines()
    failing_assertions = [l.strip() for l in lines if "✖" in l or "Error:" in l or "failed" in l.lower()]
    summary = failing_assertions[:3] if failing_assertions else ["Phát hiện lỗi trong quá trình chạy kiểm thử hoặc build."]
    
    return (
        "**Nguyên nhân:**\n" + "\n".join(f"- {s}" for s in summary) + "\n\n"
        "**Khuyến nghị:** Kiểm tra lại cú pháp, ràng buộc dữ liệu hoặc các unit test liên quan trước khi merge."
    )

def create_jira_issue(jira_url, email, token, project_key, summary, description_text):
    """Tạo Jira Issue (Bug hoặc Task)"""
    auth_str = f"{email}:{token}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    url = f"{jira_url}/rest/api/3/issue"

    adf_description = {
        "type": "doc",
        "version": 1,
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": description_text}]
            }
        ]
    }

    # Thử tạo với loại Bug trước, nếu thất bại thử với Task
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
            headers={
                "Authorization": f"Basic {auth_b64}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
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
    """Bình luận kết quả kiểm thử lên Pull Request"""
    url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
    req = urllib.request.Request(
        url,
        data=json.dumps({"body": comment_body}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {gh_token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "AI-PR-Tester"
        }
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
    repo = os.environ.get("GITHUB_REPOSITORY", "saketai72-oss/cotuong69")

    backend_outcome = os.environ.get("BACKEND_OUTCOME", "success")
    frontend_outcome = os.environ.get("FRONTEND_OUTCOME", "success")

    backend_log = read_log_file("backend_test.log")
    frontend_log = read_log_file("frontend_build.log")

    error_context = ""
    failures = []
    if backend_outcome == "failure":
        failures.append("Backend Unit/Integration Tests")
        error_context += f"--- BACKEND TEST LOG ---\n{backend_log}\n\n"
    if frontend_outcome == "failure":
        failures.append("Frontend Build / Compilation")
        error_context += f"--- FRONTEND BUILD LOG ---\n{frontend_log}\n\n"

    if not error_context:
        print("Không phát hiện lỗi kiểm thử nào.")
        return

    print("🤖 Đang phân tích lỗi bằng AI...")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    ai_diagnosis = None
    if gemini_key:
        ai_diagnosis = analyze_with_gemini(gemini_key, error_context)

    if not ai_diagnosis:
        ai_diagnosis = fallback_analysis(error_context)

    # 1. Tạo Jira Issue nếu có cấu hình Jira
    jira_url = os.environ.get("JIRA_BASE_URL", "https://cotuong69.atlassian.net").rstrip("/")
    jira_email = os.environ.get("JIRA_USER_EMAIL")
    jira_token = os.environ.get("JIRA_API_TOKEN")
    
    jira_issue_key = None
    jira_link = ""

    if jira_email and jira_token:
        summary = f"[Bug][PR #{pr_number}] Lỗi kiểm thử: {', '.join(failures)}"
        description = (
            f"Pull Request #{pr_number} bởi @{pr_author} bị thất bại khi chạy CI kiểm thử tự động.\n\n"
            f"Link PR: {pr_url}\n"
            f"Tiêu đề PR: {pr_title}\n\n"
            f"CHẨN ĐOÁN LỖI:\n{ai_diagnosis}\n\n"
            f"CHI TIẾT LOG LỖI:\n{error_context[:1500]}"
        )
        jira_issue_key, jira_err = create_jira_issue(
            jira_url, jira_email, jira_token, "COT", summary, description
        )
        if jira_issue_key:
            jira_link = f"{jira_url}/browse/{jira_issue_key}"
            print(f"✅ Đã tự động tạo Jira Issue: {jira_issue_key} ({jira_link})")
        else:
            print(f"⚠️ Không thể tạo Jira Issue: {jira_err}")

    # 2. Bình luận cảnh báo lên GitHub PR
    gh_token = os.environ.get("GITHUB_TOKEN")
    if gh_token and pr_number:
        comment = (
            f"### 🤖 AI Quality Gate: Phát hiện lỗi kiểm thử trên PR #{pr_number}\n\n"
            f"Kính gửi @{pr_author},\n"
            f"Hệ thống CI tự động đã phát hiện lỗi khi kiểm tra mã nguồn của bạn. **Vui lòng sửa lỗi trước khi merge.**\n\n"
            f"| Thành Phần | Trạng Thái |\n"
            f"| :--- | :---: |\n"
            f"| **Backend Tests** | {'❌ Thất bại' if backend_outcome == 'failure' else '✅ Thành công'} |\n"
            f"| **Frontend Build** | {'❌ Thất bại' if frontend_outcome == 'failure' else '✅ Thành công'} |\n\n"
            f"---\n\n"
            f"#### 🔍 Chẩn Đoán Lỗi Từ AI:\n"
            f"{ai_diagnosis}\n\n"
        )
        if jira_issue_key:
            comment += f"---\n> 📌 **Jira Issue đã được tạo tự động**: [{jira_issue_key}]({jira_link})\n"

        post_github_comment(repo, pr_number, gh_token, comment)

if __name__ == "__main__":
    main()
