import os
import re
import json
import base64
import urllib.request
import urllib.error
import sys

def main():
    jira_base_url = os.environ.get("JIRA_BASE_URL", "https://cotuong69.atlassian.net").rstrip("/")
    jira_email = os.environ.get("JIRA_USER_EMAIL")
    jira_api_token = os.environ.get("JIRA_API_TOKEN")

    event_name = os.environ.get("GITHUB_EVENT_NAME", "")
    ref_type = os.environ.get("REF_TYPE", "")
    ref_name = os.environ.get("REF_NAME", "")
    pr_title = os.environ.get("PR_TITLE", "")
    pr_merged = os.environ.get("PR_MERGED", "false").lower() == "true"
    commit_messages = os.environ.get("COMMIT_MESSAGES", "")
    input_issue = os.environ.get("INPUT_ISSUE_KEY", "")
    input_transition = os.environ.get("INPUT_TRANSITION_ID", "")

    print(f"Triggered by event: {event_name}")
    print(f"Ref name: {ref_name} (type: {ref_type})")
    print(f"PR title: {pr_title}")
    print(f"PR merged: {pr_merged}")

    transition_id = None
    text_to_search = f"{ref_name} {pr_title} {commit_messages} {input_issue}"

    if event_name == "workflow_dispatch":
        transition_id = input_transition
    elif event_name == "create":
        # Khi tạo branch mới -> Chuyển sang READY FOR DEV (ID: 61)
        if ref_type == "branch":
            transition_id = "61"
        else:
            print(f"Event 'create' with ref_type='{ref_type}' is not a branch creation. Exiting.")
            return
    elif event_name == "push":
        # Khi push commit vào feature branch -> Chuyển sang IN PROGRESS (ID: 21)
        transition_id = "21"
    elif event_name in ["pull_request", "pull_request_target"]:
        pr_action = os.environ.get("PR_ACTION", "")
        if pr_action in ["opened", "reopened"]:
            # Khi mở PR -> Chuyển sang READY FOR TEST (ID: 71)
            transition_id = "71"
        elif pr_action == "closed" and pr_merged:
            # Khi merge PR -> Chuyển sang DONE (ID: 31)
            transition_id = "31"
        else:
            print(f"PR action '{pr_action}' (merged={pr_merged}) does not match transition trigger criteria. Exiting.")
            return
    else:
        print(f"Unhandled event: {event_name}. Exiting.")
        return

    # Regex trích xuất Jira Issue Key (ví dụ: COT-643, COT-123)
    match = re.search(r'\b([A-Za-z]+-\d+)\b', text_to_search)
    if not match:
        print(f"No Jira issue key detected in '{text_to_search}'. Exiting.")
        return

    issue_key = match.group(1).upper()
    print(f"Found Jira Issue Key: {issue_key}")
    print(f"Target transition ID: {transition_id}")

    if not jira_email or not jira_api_token:
        print("::error::Missing JIRA_USER_EMAIL or JIRA_API_TOKEN secret. Please configure them in GitHub repository Secrets.")
        sys.exit(1)

    auth_str = f"{jira_email}:{jira_api_token}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

    url = f"{jira_base_url}/rest/api/3/issue/{issue_key}/transitions"
    headers = {
        "Authorization": f"Basic {auth_b64}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "GitHub-Actions-Jira-Sync"
    }

    payload = json.dumps({"transition": {"id": str(transition_id)}}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req) as response:
            if response.status in (200, 204):
                print(f"✅ Successfully transitioned {issue_key} to transition ID {transition_id}!")
            else:
                print(f"⚠️ Jira API responded with status {response.status}")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"::error::Jira API Error HTTP {e.code}: {e.reason} -> {error_body}")
        sys.exit(1)
    except Exception as e:
        print(f"::error::Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
