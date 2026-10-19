# Hướng Dẫn Thiết Lập & Quy Trình Tự Động Hóa Jira - GitHub

Tài liệu này hướng dẫn các thành viên trong dự án **Cờ Tướng Online (QLDACNTT)** hiểu và áp dụng quy trình tự động cập nhật trạng thái công việc trên Jira Board thông qua các thao tác Git hàng ngày trên GitHub.

---

## 1. Cơ Chế Hoạt Động (Automation Lifecycle)

Hệ thống sử dụng **GitHub Actions** (`.github/workflows/jira-sync.yml`) kết hợp Jira REST API v3 để tự động đồng bộ trạng thái task theo vòng đời phát triển tính năng:

| Thao tác Git của thành viên | Sự kiện GitHub | Trạng thái Jira tương ứng | Transition ID | Ý nghĩa & Hành động Bot |
| :--- | :--- | :--- | :---: | :--- |
| **Tạo và đẩy nhánh mới** | `create (branch)` | **`READY FOR DEV`** | `61` | Đã nhận task, bắt đầu chuẩn bị code |
| **Đẩy commit lên nhánh** | `push` (feature branch) | **`IN PROGRESS`** | `21` | Đang thực hiện lập trình |
| **Mở / Cập nhật Pull Request** | `pull_request` (opened, sync) | **`READY FOR TEST`** | `71` | CI chạy tests + AI Quality Gate kiểm tra phạm vi (scope) & Jira criteria |
| **CI & AI Gate Pass** | Bot Auto-Merge | **`DONE`** | `31` | **Tự động gộp vào `main`** không cần merge thủ công khi đạt chuẩn |
| **Revert Pull Request** | `pull_request` (revert) | **`IN PROGRESS`** | `21` | Lùi task về In Progress để sửa lại lỗi |

---

## 2. Quy Chuẩn Đặt Tên (Bắt buộc)

Workflow sẽ quét chuỗi văn bản để tìm **Jira Issue Key** có định dạng `COT-<số>`.

### Quy tắc:
* **Tên nhánh (Branch Name)**: Bắt buộc phải chứa mã task Jira (`COT-xxx`).
  * ✅ Hợp lệ: `feature/COT-605-move-rules`, `bugfix/COT-612-horse-jump`, `COT-630-chat-ui`
  * ❌ Không hợp lệ: `feature/chess-rule`, `fix-bug-ui` (Jira sẽ không nhận diện được)
* **Tiêu đề Pull Request (PR Title)**: Khuyến khích chứa mã task để dễ theo dõi.
  * ✅ Ví dụ: `[COT-605] Thuật toán kiểm tra nước đi hợp lệ cho Tướng`

---

## 3. Cấu Hình Ban Đầu Dành Cho Thành Viên / Repo Owner

Để GitHub Actions có thể gửi tín hiệu sang Jira, cần cấu hình các thông tin xác thực một lần duy nhất trong Repository Secrets.

### Bước 1: Tạo Atlassian API Token
1. Đăng nhập vào trang quản lý Atlassian: [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Nhấn nút **Create API token**.
3. Điền nhãn gợi nhớ (Label): `github-actions-jira-sync`.
4. Nhấn **Create** và **Copy mã token** (lưu ý: mã chỉ hiển thị 1 lần duy nhất).

### Bước 2: Cấu hình Secret trên GitHub
1. Vào repository GitHub của bạn hoặc tổ chức.
2. Điều hướng: **Settings** ➔ **Secrets and variables** ➔ **Actions**.
3. Nhấn **New repository secret** và thêm 3 biến sau:

| Secret Name | Giá trị mẫu | Giải thích |
| :--- | :--- | :--- |
| `JIRA_BASE_URL` | `https://cotuong69.atlassian.net` | Đường dẫn Jira Cloud của nhóm |
| `JIRA_USER_EMAIL` | `email-jira-cua-ban@gmail.com` | Email tài khoản Jira có quyền trong project |
| `JIRA_API_TOKEN` | `ATATT3xFfGF0...` | API Token vừa copy ở Bước 1 |

---

## 4. Quy Trình Làm Việc Hàng Ngày Cho Developer

### Bước 1: Tạo nhánh mới để bắt đầu làm việc
Lấy một task trên Jira (ví dụ task có mã `COT-606`), mở terminal tại thư mục dự án:

```bash
# Đảm bảo nhánh main luôn mới nhất
git checkout main
git pull origin main

# Tạo branch mới theo chuẩn mã task
git checkout -b feature/COT-606-general-rules

# Đẩy branch lên GitHub
git push -u origin feature/COT-606-general-rules
```
> 🎯 **Kết quả:** Task `COT-606` trên Jira tự động nhảy từ **TO DO** sang **`READY FOR DEV`**.

---

### Bước 2: Viết code và commit tiến độ
Trong quá trình code, mỗi lần bạn hoàn thành một phần việc và push commit lên:

```bash
git add .
git commit -m "feat(COT-606): hoàn thiện kiểm tra nước cản của Tướng"
git push
```
> 🎯 **Kết quả:** Task `COT-606` trên Jira tự động nhảy sang **`IN PROGRESS`**.

---

### Bước 3: Tạo Pull Request sau khi code xong
1. Truy cập vào GitHub repository.
2. Chọn **Pull Requests** ➔ **New pull request**.
3. Chọn nhánh nguồn là `feature/COT-606-general-rules`, nhánh đích là `main`.
4. Đặt tiêu đề (ví dụ: `feat: COT-606 Hoàn thành logic quân Tướng`) và nhấn **Create pull request**.
> 🎯 **Kết quả:** Task `COT-606` trên Jira tự động nhảy sang **`READY FOR TEST`**.

---

### Bước 4: Tự Động Kiểm Thử, AI Quality Gate & Auto-Merge
Ngay khi Pull Request được tạo hoặc có commit mới được đẩy lên, GitHub Actions Bot sẽ tự động thực thi chu trình:
1. **Kiểm thử tự động (Unit Tests & Build)**: Chạy toàn bộ bài test Backend và kiểm tra build/tests Frontend.
2. **AI Quality Gate & Scope Verification**:
   - Đối chiếu thay đổi mã nguồn với Mô tả (Description) và Tiêu chí nghiệm thu (Acceptance Criteria) của Task trên Jira.
   - Kiểm tra Scope Guard: Đảm bảo PR không sửa nhầm/chèn lấn vào module của các task khác.
3. **Cơ Chế Auto-Merge Hoàn Toàn Tự Động**:
   - ✅ **Nếu Tests Pass và Scope Đạt Chuẩn**: Bot sẽ **tự động gộp (auto-merge)** nhánh PR vào `main`. Ngay sau đó, workflow đồng bộ Jira sẽ tự động chuyển trạng thái task sang **`DONE`** mà chủ repo không cần phải thao tác thủ công.
   - ⚠️ **Nếu có xung đột mã nguồn (Conflict)**: Bot gửi bình luận hướng dẫn bạn rebase/merge nhánh `main` mới nhất để giải quyết conflict.
   - ❌ **Nếu Tests Thất Bại hoặc Sai Scope**: Bot chặn merge, gửi bình luận chẩn đoán nguyên nhân lỗi từ AI và tự động tạo Bug Issue trên Jira để yêu cầu sửa chữa.

---

## 5. Lưu Ý Dành Cho Thành Viên Sử Dụng Repo Fork

Nếu bạn phát triển theo mô hình **Fork repository**:
1. **Repository Secrets**: Phải được cấu hình trên chính repo Fork cá nhân của bạn (theo mục 3).
2. **Tạo Pull Request nội bộ để test**:
   * Khi mở PR trên giao diện GitHub, chú ý chọn **base repository** là repo fork của bạn (thay vì repo upstream của nhóm nếu repo nhóm chưa cấu hình Secrets).
   * Khi tạo PR gộp vào repo chính của nhóm (Upstream), nếu muốn tự động hóa kích hoạt trên repo chính thì Admin của repo chính cần cài đặt các Secret nêu trên vào repo gốc.

---

## 6. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

| Hiện tượng | Nguyên nhân có thể | Cách xử lý |
| :--- | :--- | :--- |
| **Push code nhưng Jira không đổi cột** | 1. Tên branch/commit không chứa mã task đúng định dạng `COT-xxx`.<br>2. Chưa cài đặt hoặc điền sai GitHub Secrets.<br>3. GitHub Actions bị tắt trên repo fork. | 1. Kiểm tra lại tên nhánh bằng `git branch`.<br>2. Vào tab **Actions** trên GitHub xem chi tiết log lỗi.<br>3. Kiểm tra mục **Settings** ➔ **Actions** ➔ **General** ➔ chọn *Allow all actions*. |
| **Lỗi `401 Unauthorized` trong Action log** | Token Jira hoặc email không đúng. | Tạo lại API Token trên Atlassian và cập nhật lại `JIRA_API_TOKEN`. |
| **Lỗi `404 Not Found` trong Action log** | Mã task không tồn tại trên Jira (ví dụ gõ nhầm `COT-9999`). | Kiểm tra lại chính xác mã task trên Board Jira. |
