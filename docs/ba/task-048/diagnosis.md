# Task-048 — Chẩn đoán yêu cầu mở chu kỳ đang chờ OKX

Ngày2026-10-25; ghi nhận preliminary ban đầu bên dưới. **Update:** Leader đã xác minh club legacy thiếu cycle API bằng eth_call/estimateGas/getter/bytecode; scope sửa được chốt tại [spec-v1](./spec-v1.md), thay thế trạng thái chưa đủ căn cứ ban đầu. BA không tự chạy live write.

## Hiện tượng từ ảnh do Leader chuyển

Ứng dụng localhost5173, group `0xc5064f3963761eef64ece72f853e90871ff1e1e9`, sender `0xb59b2c4efdae4a9d9eb497e435cf25b65001d224`; nút startNewCycle hiển thị Sign in wallet, OKX hiển thị Unknown transaction, Network fee `--`, Confirm disabled. Loading hook dùng chung, nên ảnh không chứng minh chính xác nút đã bấm hay method của wallet request; Leader đã hỏi người dùng và chưa capture calldata request đang chờ. Chưa có bằng chứng transaction hash hoặc contract revert từ ảnh. Các RPC reads sau đó xác minh riêng lỗi restart legacy, không phải bản capture request ví và không phải verified source của deployed contract.

## Facts xác minh trong repository

- ActionPanel `handleStartNewCycle` gửi address/ABI/functionName/chainId5042002; không gửi value, gas hoặc fee fields. Loading label Sign in wallet xuất hiện khi wrapper/wagmi mutation pending, phù hợp RPC gửi transaction chưa được ví trả lời; tự nó không phải receipt pending.
- useArcWriteContract chờ ensureArcChain trước forwarding. ensureArcChain dùng account chain state và kết quả switch; viem json-rpc sendTransaction còn kiểm eth_chainId thực từ provider trước gửi.
- Installed @wagmi/core writeContract dùng getConnectorClient cho injected account. Installed viem actions/wallet/sendTransaction json-rpc branch format request rồi gọi eth_sendTransaction; không tự prepare gas/fees qua public RPC như local-account branch. Vì vậy request hiện tại để OKX tự estimate gas/fees.
- Wagmi public transport lấy RPC từ facts. Điều này không đồng nghĩa cấu hình custom-chain RPC đã lưu trong OKX được cập nhật; viem chain metadata mặc định và facts RPC cần phân biệt khi chẩn đoán.
- Solidity startNewCycle đòi COMPLETED, caller là member hoặc owner, members.length>=2; reset cycle/member flags và mở round tiếp theo, không chuyển token/collateral. Runtime deployed contract/state có thể khác source, cần read-only call xác minh.
- Existing T044-CHAIN/GUARDED-HOOK tests kiểm switch ordering, rejection, wrong returned chain, forwarding và followup. Chúng mock wallet writes, không chứng minh fee estimation hoặc saved-network config của OKX.

## Phân biệt giả thuyết và bằng chứng cần bổ sung

| Giả thuyết | Kiểm tra phân biệt, chỉ đọc |
| --- | --- |
| Contract call không hợp lệ với state/caller/deployed ABI | eth_call và eth_estimateGas đúng sender/target/calldata; state/member/owner/members count, deployed bytecode |
| Không đủ native gas balance hoặc fee data lỗi | native eth_getBalance18, estimateGas, gasPrice/feeHistory/latest baseFee; không dùng ERC20 raw6 làm native gas units |
| OKX RPC/fee estimation hoặc cấu hình chain có vấn đề | Actual provider eth_chainId, selected account và request đã pending; đọc console/network nếu có, đối chiếu public Arc RPC hoạt động; không confirm/reject hoặc tạo thêm write request |
| Unknown transaction chỉ là wallet không giải mã method | Đối chiếu calldata selector/ABI; tên Unknown transaction một mình không chứng minh revert hoặc contract hỏng |

Chưa chọn sửa contract, cố định gas/fee, thay chain config hoặc tự động retry. Không yêu cầu người dùng gửi giao dịch thử. Nếu public simulation/estimate thành công nhưng OKX không lấy fee, có thể cân nhắc chuẩn bị gas/fee từ Arc public client với error handling và tests tương ứng, sau khi Leader xác nhận căn cứ cùng scope.

Không wallet confirmation/send transaction/deployment. Giữ3original reviewdocs unmodified/excluded. BA sẽ viết spec tối thiểu khi nguyên nhân/phương án được Leader chốt; chưa có QA signoff hoặc kết luận đã sửa lỗi.
