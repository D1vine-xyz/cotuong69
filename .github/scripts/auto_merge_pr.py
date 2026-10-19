import os
import sys
import json
import time
import urllib.request
import urllib.error

def gh_api_request(url, token, data=None, method=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "GitHub-Actions-Auto-Merge"
    }
    encoded_data = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else {}, resp.status, None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return None, e.code, body
    except Exception as e:
        return None, 500, str(e)

def post_comment(repo, pr_number, token, comment_body):
    url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
    gh_api_request(url, token, data={"body": comment_body})

def main():
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("REPOSITORY") or os.environ.get("GITHUB_REPOSITORY", "saketai72-oss/cotuong69")
    pr_number = os.environ.get("PR_NUMBER")
    pr_author = os.environ.get("PR_AUTHOR", "contributor")
    pr_title = os.environ.get("PR_TITLE", "Pull Request")
    pr_branch = os.environ.get("PR_BRANCH", "feature")
    base_ref = os.environ.get("BASE_REF", "main")

    if not token or not pr_number:
        print("::error::Thiếu GITHUB_TOKEN hoặc PR_NUMBER.")
        sys.exit(1)

    print(f"🤖 Bắt đầu Auto Merge cho PR #{pr_number} ({pr_branch} -> {base_ref})")

    # 1. Lấy thông tin PR và kiểm tra tính hợp lệ
    pr_url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}"
    pr_data = None
    
    # Chờ GitHub tính toán trạng thái mergeable (nếu đang null)
    for _ in range(8):
        data, status, err = gh_api_request(pr_url, token)
        if status == 200 and data:
            pr_data = data
            if pr_data.get("merged"):
                print("ℹ️ PR đã được merge trước đó. Kết thúc.")
                return
            if pr_data.get("state") != "open":
                print(f"ℹ️ PR đang ở trạng thái {pr_data.get('state')}. Không thể merge.")
                return
            if pr_data.get("mergeable") is not None:
                break
        time.sleep(2)

    if not pr_data:
        print(f"::error::Không thể lấy thông tin PR #{pr_number}: {err}")
        sys.exit(1)

    mergeable = pr_data.get("mergeable")
    mergeable_state = pr_data.get("mergeable_state", "unknown")
    print(f"Trạng thái PR: mergeable={mergeable}, mergeable_state={mergeable_state}")

    # Xử lý khi có xung đột (merge conflict)
    if mergeable is False or mergeable_state == "dirty":
        print("⚠️ PR bị xung đột mã nguồn (merge conflict). Đang gửi thông báo...")
        comment = (
            f"### ⚠️ Auto-Merge Tạm Hoãn: Phát Hiện Xung Đột Mã Nguồn (Conflict)\n\n"
            f"Kính gửi @{pr_author},\n\n"
            f"PR này đã vượt qua các bài kiểm thử tự động, tuy nhiên nhánh `{pr_branch}` hiện đang bị **xung đột (merge conflict)** với nhánh `{base_ref}`.\n\n"
            f"🛠️ **Hướng dẫn khắc phục:**\n"
            f"1. Kéo mã nguồn mới nhất từ `{base_ref}`:\n"
            f"   ```bash\n"
            f"   git fetch origin\n"
            f"   git merge origin/{base_ref}\n"
            f"   ```\n"
            f"2. Giải quyết xung đột trong các file conflict, commit và push lại lên nhánh `{pr_branch}`.\n"
            f"3. Hệ thống sẽ tự động chạy lại kiểm thử và tự động gộp (auto-merge) ngay khi hoàn tất!"
        )
        post_comment(repo, pr_number, token, comment)
        return

    # 2. Thực hiện Merge qua REST API
    merge_url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}/merge"
    merge_payload = {
        "commit_title": f"Merge pull request #{pr_number} from {pr_branch}",
        "commit_message": f"Auto-merged by Bot after passing CI tests & Jira QA gate.\n\nPR #{pr_number}: {pr_title}",
        "merge_method": "merge"
    }
    
    merge_res, merge_status, merge_err = gh_api_request(merge_url, token, data=merge_payload, method="PUT")

    if merge_status == 200:
        print(f"🎉 Đã auto-merge thành công PR #{pr_number}!")
        success_comment = (
            f"### 🚀 Auto-Merge Thành Công!\n\n"
            f"PR #{pr_number} đã vượt qua toàn bộ kiểm thử tự động và Jira Scope Gate.\n\n"
            f"- **Trạng thái:** Đã tự động gộp (merged) vào nhánh `{base_ref}`.\n"
            f"- **Người thực hiện:** GitHub Actions Bot 🤖\n"
            f"- **Jira Automation:** Task liên kết sẽ tự động chuyển sang trạng thái `DONE` ✅."
        )
        post_comment(repo, pr_number, token, success_comment)
        return

    # 3. Fallback: Nếu nhánh bật Branch Protection yêu cầu auto-merge qua GraphQL
    print(f"⚠️ REST merge trả về HTTP {merge_status}: {merge_err}. Thử fallback kích hoạt qua GraphQL...")
    node_id = pr_data.get("node_id")
    if node_id:
        graphql_url = "https://api.github.com/graphql"
        mutation = {
            "query": """
            mutation($prId: ID!) {
              enablePullRequestAutoMerge(input: {pullRequestId: $prId, mergeMethod: MERGE}) {
                pullRequest {
                  autoMergeRequest {
                    enabledAt
                  }
                }
              }
            }
            """,
            "variables": {"prId": node_id}
        }
        gql_res, gql_status, gql_err = gh_api_request(graphql_url, token, data=mutation, method="POST")
        if gql_status == 200 and gql_res and not gql_res.get("errors"):
            print("🎉 Đã kích hoạt enablePullRequestAutoMerge thành công qua GraphQL!")
            return
        else:
            print(f"⚠️ GraphQL fallback thất bại: {gql_res.get('errors') if gql_res else gql_err}")

    print(f"::error::Không thể auto-merge PR #{pr_number}. REST Status: {merge_status}, Err: {merge_err}")
    post_comment(repo, pr_number, token, f"⚠️ Bot không thể tự động merge PR #{pr_number}: {merge_err}")
    sys.exit(1)

if __name__ == "__main__":
    main()
