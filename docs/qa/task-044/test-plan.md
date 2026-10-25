# Task-044 — kế hoạch kiểm thử độc lập

Trạng thái: **planned**, chưa chạy trên source đã freeze, chưa signoff.

Tester: `/root/tester`; ngày 2026-10-25. Đầu vào đã đọc: hai tài liệu `docs/tontine-arc-review.md`, `docs/tontine-fix-recommendations.md`, source hiện tại và diff Gemini. Leader đã duyệt `docs/ba/task-044/spec-v1.md` và giao quyền bổ sung test trong lúc Developer thực hiện; chưa chạy/signoff đến khi freeze.

| REQ spec v1 | Suite dự kiến |
| --- | --- |
| REQ-01 | SOL-CANCEL-01..05, SOL-COLLATERAL-01, fuzz cancellation conservation |
| REQ-02 | Cancellation UI source integration review; pending frozen UI |
| REQ-03 | T044-MONEY, T044-ERROR-FACTS, T044-INTEGRATION |
| REQ-04 | T044-INTEGRATION và transport review |
| REQ-05 | T044-CHAIN, T044-GUARDED-HOOK và mọi write/deploy call-site review |
| REQ-06 | SOL-COLLATERAL-01, T044-DEPLOY, existing-club token source review |
| REQ-07 | T044-SESSION và logout hook review |
| REQ-08 | SOL-TIME-01, SOL-CYCLE-01, T044-ERROR-FACTS |
| REQ-09 | T044-HISTORY và truncated UI/member winner review |
| REQ-10 | Manifest before/after, build/npm/Foundry logs và artifact comparison |

## Điều kiện chạy và bằng chứng

- Leader giao bản spec và manifest `docs/manifests/task-044/manifest.json`.
- Chạy `node scripts/manifest-tool.mjs verify task-044` trước và sau mọi lượt nghiệm thu; hash đổi thì không signoff lượt đó.
- Test Solidity dùng Foundry thật và mock ERC-20 trên EVM local, không giao dịch mạng công khai. Forge: `/tmp/tontine-task-044-toolchain/node_modules/@foundry-rs/forge-linux-amd64/bin/forge`; compiler `--use /tmp/tontine-task-044-toolchain/solc-0.8.28`; output và cache tạm ở `/tmp` để không đổi artifact frozen.
- Test TypeScript ưu tiên gọi implementation thật với fake storage/provider ở biên hệ thống; không chép lại thuật toán implementation để tạo kết quả pass.
- Ghi lệnh, stdout/stderr, exit code, số pass/fail/skip, expected/actual và phạm vi chưa kiểm chứng trong `test-report.md`. Kết quả baseline do Leader báo (395 test pass, typecheck fail 8 lỗi) chỉ là bối cảnh, không phải signoff của Tester.

## Ma trận test dự kiến

| ID | Kịch bản và kỳ vọng | Loại bằng chứng |
| --- | --- | --- |
| SOL-CANCEL-01 | OPEN còn huỷ được theo majority hiện có; owner không đơn phương huỷ nhóm nhiều thành viên; outsider bị từ chối; duplicate vote không tăng đếm | Foundry runtime |
| SOL-CANCEL-02 | ACTIVE có contribution và bid tăng nhiều lần; chưa đủ vote không đổi claimable; đạt majority hoàn đúng contribution cộng tổng bid cuối cùng của từng member | Foundry runtime |
| SOL-CANCEL-03 | Huỷ ACTIVE qua `cancelGroup` là lá phiếu cuối của owner và qua `voteCancelGroup` là lá phiếu cuối của member đều hoàn tiền đúng | Foundry runtime |
| SOL-CANCEL-04 | Claimable từ vòng đã settle được cộng dồn cùng refund vòng hiện tại; tổng nghĩa vụ không vượt USDC balance; claim chuyển số dư thật và lần claim thứ hai revert | Foundry runtime |
| SOL-CANCEL-05 | Sau CANCELLED không contribute, bid, settle hoặc cancel tiếp; không hoàn hai lần, không sửa nghĩa vụ các vòng trước | Foundry runtime |
| SOL-COLLATERAL-01 | Token constructor khác default: getter, deposit và claim đều dùng token được truyền; zero address bị từ chối; USDC refund độc lập collateral | Foundry runtime |
| SOL-TIME-01 | Đúng `endTime` còn contribute/bid; `endTime + 1` trả `RoundEnded`; settle sớm chưa đủ điều kiện trả `RoundStillOpen`; outsider settle sau deadline vẫn được | Foundry runtime |
| SOL-CYCLE-01 | New cycle reset thắng/kick/vote theo spec, giữ claimable lịch sử và collateral đã slash không tự phục hồi; owner không phải member không giữ cờ vote lỗi qua cycle | Foundry runtime |
| TS-MONEY-01 | Format USDC lớn hơn 2^53 không mất chữ số; zero, fraction, grouping và precision boundary đúng; parse decimal/leading dot/invalid/excess decimals theo spec hiện hành | Node runtime |
| TS-ERROR-01 | `RoundEnded` và `RoundStillOpen` tạo thông điệp khác đúng ngữ nghĩa | Node runtime |
| TS-CHAIN-01 | Sai chain: await switch hoàn tất rồi mới write; đúng chain không switch thừa; switch reject thì không write; kiểm tất cả entry point owner/claim/actions/create và approval continuation | Runtime provider/helper + integration review |
| TS-HISTORY-01 | 0/1/49/50/51/100 rounds và bigint lớn: tối đa 50 calls, giữ đúng round ID offset, không đổi ID khi call lỗi hoặc round chưa settle | Runtime hook/helper |
| TS-SESSION-01 | Session save/load/clear; legacy localStorage migration hoặc purge theo spec; JSON hỏng và storage throw không crash; không ghi credential raw vào persistent storage | Runtime storage |
| TS-FACTS-01 | USDC address/decimals và RPC đọc registry; không cộng native USDC lần hai; Circle bundler vẫn dùng modular transport; không lộ backend proxy secret | Runtime assertions + source review |
| ARTIFACT-01 | ABI constructor và bytecode khớp source build; mọi deploy caller truyền đủ args; metadata deployment cũ không bị viết lại thành deployment mới | Compile/artifact comparison + deploy encoding test |
| REGRESSION-01 | Toàn bộ `npm test`, `npm run typecheck`, `npm run build` và Solidity suite trên source freeze; test cũ đổi vì constructor cần cập nhật fixture đúng, không hạ tiêu chí nghiệp vụ | Command logs |

## Giới hạn và điểm cần đối chiếu spec

- Tài liệu review không phải oracle tuyệt đối: RPC registry hiện vẫn là public URL; passkey client đã dùng Circle transport; `P256Credential` của viem cài đặt gồm id/publicKey/raw, không có private key field. Không ghi các khẳng định sai này thành tiêu chí pass.
- Hành vi bỏ phiếu owner khi không phải member, member bị kick, phiếu từ OPEN sang ACTIVE, owner transfer và cycle reset cần bám spec; báo Leader nếu mâu thuẫn hoặc không có quyết định.
- Huỷ ACTIVE không tự đảo ngược payout đã settle. Test bảo toàn số dư chỉ xác minh kế toán đúng phạm vi, không chứng minh mô hình kinh tế công bằng tuyệt đối.
- Tương tác ví MetaMask/WebAuthn thật và rate-limit dịch vụ không được chứng minh bởi test local; nếu không chạy sẽ ghi rõ chưa kiểm chứng.
