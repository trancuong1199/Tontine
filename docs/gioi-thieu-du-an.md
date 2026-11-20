# Tontine — Hụi minh bạch trên blockchain

*Bài giới thiệu dự án để thuyết trình · [Tên người trình bày] · [Ngày]*

---

## 1. Mở đầu

Tontine là phiên bản "hụi" chạy trên blockchain Arc. Thành viên góp USDC vào một smart contract. Chủ nhóm muốn dùng tiền quỹ thì phải đặt cọc bằng cirBTC (Bitcoin dạng token trên Arc). Mọi quy tắc như hạn trả lãi, vỡ nợ, rút tiền đều do hợp đồng tự động thực thi.

Nội dung hôm nay: vấn đề, giải pháp, cách hoạt động, cơ chế bảo vệ thành viên, rủi ro còn lại, công nghệ và demo.

---

## 2. Vấn đề: hụi truyền thống dựa hoàn toàn vào niềm tin

- **Chủ hụi giữ toàn bộ tiền.** Tiền góp của cả nhóm nằm trong tay một người. Chủ hụi mất khả năng chi trả là cả nhóm mất tiền.
- **Không minh bạch.** Ai đã góp, ai đã nhận, ai còn nợ bao nhiêu chỉ nằm trong sổ tay hoặc tin nhắn.
- **Khó đòi khi "bể hụi".** Không có tài sản bảo đảm, việc thu hồi phụ thuộc vào thương lượng hoặc kiện tụng.

> Ý tưởng cốt lõi: **Không ai cầm tiền của cả nhóm. Smart contract cầm.** Thay niềm tin vào một người bằng luật chơi công khai, tự động và kiểm chứng được.

---

## 3. Giải pháp

1. **Tiền nằm trong hợp đồng.** USDC thành viên góp được giữ trong smart contract. Không ai rút tùy ý, kể cả chủ nhóm.
2. **Chủ nhóm phải đặt cọc.** Muốn vay từ quỹ, chủ nhóm nạp cirBTC làm thế chấp và chỉ được vay trong hạn mức cọc cho phép.
3. **Ai cũng kiểm tra được.** Mọi khoản góp, vay, trả lãi đều ghi trên chain và xem được trên Arc Explorer.

---

## 4. Ba vai trò trong một nhóm

| Vai trò | Làm gì |
|---|---|
| **Thành viên** | Tham gia qua link mời, góp USDC mỗi vòng, nhận lãi chủ nhóm trả, rút lại gốc khi tất toán |
| **Chủ nhóm** | Tạo nhóm qua Factory, nạp cọc cirBTC, vay từ quỹ trong hạn mức, trả lãi mỗi vòng, trả gốc cuối chu kỳ |
| **Bất kỳ ai** | Theo dõi nhóm trên chain; tuyên bố vỡ nợ khi chủ nhóm trễ hạn trả lãi hoặc tất toán |

Vai trò thứ ba quan trọng: không cần "trọng tài", ai cũng có thể kích hoạt vỡ nợ khi đủ điều kiện.

---

## 5. Vòng đời của một nhóm

1. **Tạo nhóm** — chọn mức góp, số thành viên, số vòng (1 đến số thành viên), thời lượng mỗi vòng. Tên nhóm không được trùng.
2. **Tham gia** — thành viên vào nhóm qua link mời, tối thiểu 2 người.
3. **Cọc và bắt đầu** — chủ nhóm nạp cirBTC rồi bấm "Bắt đầu các vòng".
4. **Mỗi vòng** — thành viên góp USDC; chủ nhóm được vay **một lần** và trả lãi.
5. **Tất toán** — hết chu kỳ, chủ nhóm trả hết gốc và lãi, bấm Finalize.
6. **Rút tiền** — mỗi thành viên tự rút gốc và lãi; chủ nhóm rút lại cọc.

**Nhánh vỡ nợ:** nếu chủ nhóm trễ hạn trả lãi hoặc quá hạn tất toán, bất kỳ ai cũng tuyên bố vỡ nợ. Thành viên chia phần USDC còn trong quỹ và toàn bộ cọc cirBTC theo tỷ lệ đã góp.

---

## 6. Ví dụ thật trên Arc Testnet

Nhóm thử nghiệm "Tesst" (1 vòng, 2 thành viên × 5 USDC):

| | Giá trị |
|---|---|
| Quỹ đã góp | 10 USDC |
| Cọc của chủ nhóm | 0,00010005 cirBTC ≈ 6,19 USDC |
| Hạn mức vay = giá trị cọc ÷ 120% | ≈ 5,16 USDC |
| Vay tối đa (trừ lãi của vòng) | ≈ 5,13 USDC |

**Hạn mức vay đi theo cọc, không theo số tiền đã góp.** Muốn vay hết 10 USDC, chủ nhóm cần cọc trị giá khoảng 12,06 USDC (≈ 0,000195 cirBTC). Giá BTC trên testnet là giá mock.

---

## 7. Bốn lớp bảo vệ thành viên (kiểm tra trong smart contract)

1. **Hạn mức 120%.** Nợ cộng lãi không được vượt giá trị cọc chia 1,2 tại thời điểm vay.
2. **Vay một lần mỗi vòng.** Chủ nhóm không thể vay, trả rồi vay lại liên tục trong cùng một vòng.
3. **Lãi theo mức nợ cao nhất.** Lãi mỗi vòng tính trên dư nợ cao nhất của vòng đó, chia cho thành viên theo tỷ lệ tiền góp. Trả sớm rồi vay lại không giúp "né" lãi.
4. **Vỡ nợ không cần xin phép.** Trễ hạn trả lãi hoặc tất toán, bất kỳ ví nào cũng kích hoạt vỡ nợ để thành viên nhận cọc thu hồi.

Ngoài ra: rút tiền theo kiểu "pull" — mỗi người tự rút phần của mình, contract không tự gửi tiền đi.

---

## 8. Rủi ro còn lại (nói thẳng)

- **Không thanh lý theo giá.** Mức 120% chỉ đảm bảo tại lúc vay. Nếu BTC giảm hơn khoảng 17% sau đó (1 − 1/1,2), cọc có thể không đủ bù nợ.
- **Phụ thuộc oracle giá.** Hạn mức tính theo giá BTC/USD từ oracle; trên testnet hiện dùng giá mock.
- **Rủi ro token.** cirBTC có thể lệch giá so với BTC; vẫn có rủi ro từ bên phát hành USDC và cirBTC.
- **Đang ở testnet.** Chưa dùng tiền thật; cần audit độc lập trước khi lên mainnet.

---

## 9. Công nghệ

- **Blockchain:** Arc Testnet (chain ID 5042002), phí gas trả bằng USDC.
- **Smart contract:** Solidity 0.8.28 + Foundry — `BondedTontine` (một nhóm) và `BondedTontineFactory` (tạo nhóm, gắn sẵn USDC, cirBTC và oracle chuẩn để chủ nhóm không thể dùng oracle giả).
- **Tài sản:** USDC (6 số lẻ) để góp và vay; cirBTC (8 số lẻ) làm thế chấp; oracle BTC/USD chuẩn Chainlink.
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, wagmi v2, viem v2, ConnectKit.
- **Kiểm thử:** 122 test Foundry cho contract, 555 test cho frontend.

---

## 10. Cập nhật mới nhất

- Chọn **số vòng** khi tạo nhóm (từ 1 đến số thành viên).
- **Tên nhóm không trùng**, kiểm tra ngay trên chain (không phân biệt hoa thường).
- Chủ nhóm **vay một lần mỗi vòng**.
- Nhóm chỉ hiện khi mở bằng **link mời** hoặc chọn từ Danh sách nhóm.
- Vòng **60 giây** để thử nhanh.
- Mức cọc đề xuất tính cho **một vòng** quỹ.

Factory hiện tại trên Arc Testnet: `0xF35490acc81DE12b752C6F02e6d11d203F01A80E`
(https://explorer.testnet.arc.io/address/0xF35490acc81DE12b752C6F02e6d11d203F01A80E)

---

## 11. Kịch bản demo

1. Kết nối ví (OKX hoặc MetaMask) trên Arc Testnet.
2. Tạo nhóm: 3 thành viên, 1 vòng, vòng 60 giây.
3. Copy link mời, 2 ví khác tham gia nhóm.
4. Chủ nhóm nạp cọc cirBTC theo mức đề xuất, bấm Bắt đầu.
5. Thành viên góp USDC; chủ nhóm vay một lần, thử vay lần hai để thấy bị chặn.
6. Chủ nhóm trả lãi và gốc, bấm Finalize; thành viên rút gốc và lãi.

---

## 12. Kết

Tontine giữ lại điều hay của hụi — tiết kiệm theo nhóm và tiếp cận vốn — nhưng bỏ đi điểm yếu lớn nhất: phải tin tuyệt đối vào một người. Tiền nằm trong smart contract, chủ nhóm phải đặt cọc, và luật chơi minh bạch cho tất cả.

**Cảm ơn mọi người. Hỏi & đáp.**

Mã nguồn: https://github.com/trancuong1199/Tontine
