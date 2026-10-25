# Focus — Hệ thống giao diện (chốt)

Trạng thái: **ĐỀ XUẤT CHỐT** — dùng làm nguồn chuẩn cho các lát UI_00 → UI_04.
Phạm vi: app mobile (Expo / React Native), 5 tab hiện có. Không đổi nghiệp vụ, không đổi API.

## 1. Định hướng

- Tinh thần: **Forest-lite** — ấm, tĩnh, "nuôi cây theo phiên"; không sao chép hình ảnh/nhãn hiệu của Forest.
- Cảm giác chính: nền kem ấm + xanh rừng + điểm vàng nắng; bề mặt phẳng, bo tròn lớn, ít đường kẻ.
- Mỗi phiên tập trung = một cái cây lớn dần; phiên huỷ = cây héo. Đây là ngôn ngữ hình ảnh xuyên suốt.

### Nguồn tham chiếu (skill `ui-ux-pro-max`)

| Nguồn | Lấy gì | Bỏ gì |
|---|---|---|
| `colors.csv` → *Plant Care Tracker* | Palette "Nature green + sun yellow": primary xanh, accent vàng, nền sáng | Nền xanh mint `#F0FDF4` quá lạnh → đổi sang kem `#FAF7EF` |
| `products.csv` → *Habit Tracker* | Streak dùng màu ấm (amber), tiến độ dùng xanh | Claymorphism 3D, Vibrant Block-based: nặng, lệch tinh thần Forest, tốn hiệu năng mobile |
| `typography.csv` → *Soft Rounded* (Varela Round + Nunito Sans) | Chữ tròn, thân thiện | Varela Round chỉ có 1 weight → dùng **Nunito** cho cả heading và body (400/600/700/800) |
| `ux-guidelines.csv` → *Compact Label Overflow*, *Back Button* | Chip không được xuống dòng/cắt; back phải đúng | — |
| `stacks/react-native.csv` | `Pressable`, `hitSlop`, phản hồi khi nhấn | `TouchableOpacity` cho code mới |

## 2. Tokens

### 2.1 Màu

| Token | Hex | Dùng cho | Tương phản |
|---|---|---|---|
| `background` | `#FAF7EF` | Nền toàn app | — |
| `surface` | `#FFFDF7` | Card, sheet, input | — |
| `surfaceMuted` | `#F2EEE2` | Chip thường, ô nhập, skeleton | — |
| `primary` | `#2F6B4F` | CTA chính, tab active, ring tiến độ | 5.88:1 trên nền; trắng trên primary 6.29:1 |
| `primaryPressed` | `#24543E` | Trạng thái nhấn | 8.13:1 |
| `primarySoft` | `#E7EFE2` | Chip đang chọn, nền nhấn nhẹ | primary trên nền này 5.35:1 |
| `accent` | `#C97B1E` | **Chỉ trang trí**: mặt trời, streak icon, điểm nhấn ≥24px | 3.10:1 — không dùng cho chữ thường |
| `accentStrong` | `#8A5A12` | Chữ/biểu tượng nhỏ màu vàng | 5.52:1 |
| `accentSoft` | `#FBEFD9` | Nền badge streak | — |
| `leaf` | `#7FA96B` | Tán lá, chi tiết cây | Trang trí |
| `text` | `#1F2A22` | Chữ chính | 13.89:1 |
| `muted` | `#5B6B60` | Chữ phụ, nhãn | 5.28:1 |
| `border` | `#E4DFCF` | Viền 1px, đường chia | — |
| `danger` | `#B3452F` | Phiên huỷ, cây héo, xoá | 5.15:1 |
| `dangerSoft` | `#F6E3DC` | Nền cảnh báo nhẹ | — |
| `ringTrack` | `#E7E3D2` | Vòng nền của progress ring | — |

Quy tắc: mọi trạng thái phải có **chữ hoặc icon kèm màu**, không dùng màu làm tín hiệu duy nhất.
Không dùng gradient tím/hồng, neon, bóng đổ nặng, chữ dưới 12px.

### 2.2 Chữ

Font: **Nunito** (hỗ trợ tiếng Việt), fallback system (`System` / `sans-serif`) khi chưa load xong.

| Token | Size/Line | Weight | Dùng |
|---|---|---|---|
| `display` | 44/48 | 800 | Số đếm ngược |
| `h1` | 28/34 | 800 | Tiêu đề màn |
| `h2` | 20/26 | 700 | Tiêu đề khối |
| `title` | 16/22 | 700 | Tên công việc, tên cây |
| `body` | 16/24 | 400 | Nội dung chính |
| `bodySm` | 14/20 | 400 | Mô tả phụ |
| `label` | 13/18 | 600 | Nút, chip, tab |
| `caption` | 12/16 | 600 | Nhãn nhỏ, đơn vị |
| `kicker` | 11/14 | 700, ls 1.2, UPPERCASE | Nhãn trên tiêu đề |

Số đếm ngược dùng `fontVariant: ['tabular-nums']`.

### 2.3 Khoảng cách, bo góc, chuyển động

- Spacing: `4 / 8 / 12 / 16 / 20 / 24 / 32` (`xs…xxl` cộng thêm `xxs=4`, `md2=20`).
- Padding ngang màn: **20**. Khoảng cách giữa card: **12**. Padding trong card: **16**.
- Radius: `sm 12`, `md 16`, `lg 20`, `pill 999`.
- Chạm: mọi vùng bấm ≥ **44×44**; icon nhỏ dùng `hitSlop 8–10`.
- Motion: nhấn 150–200ms ease-out; đổi giai đoạn cây 400ms; ring cập nhật mỗi giây; tôn trọng `reduceMotion`.

## 3. Component

| Component | Spec | Ghi chú |
|---|---|---|
| `Screen` | Nền `background`, an toàn safe-area, padding ngang 20 | Không lặp lại khung trắng |
| `ScreenHeader` | Kicker + h1 + hành động phải (nút 44×44) | Tiêu đề tối đa 2 dòng, không cắt |
| `Card` | `surface`, radius 20, viền 1px `border`, padding 16, **không shadow** | Nhấn: opacity 0.9 |
| `Button` (primary) | Cao 52, radius 16, nền `primary`, chữ trắng 16/700 | Disabled: opacity 0.4; loading: spinner thay chữ |
| `Button` (ghost) | Chữ `primary`, không nền, cao 44 | Hành động phụ |
| `Chip` | Cao 36, radius pill, paddingH 14 | Chọn: nền `primarySoft`, chữ `primary`; thường: `surfaceMuted` + `muted` |
| `StatusPill` | Chấm 6px + nhãn `label` | Đang mở = primary; Đã xong = muted; Lưu trữ = border |
| `ProgressRing` | Đường kính 260 (nhỏ 240), stroke 10, track `ringTrack`, tiến độ `primary`; số đếm 44/800 ở giữa | Vẽ bằng `react-native-svg`; cây vẽ riêng bên dưới ring |
| `Tree` | 5 giai đoạn + 1 héo, SVG path, màu lấy từ seed | Giai đoạn = `floor(progress × 4)`, không tự tính điểm |
| `EmptyState` | Minh hoạ mầm cây + 1 câu + CTA | Không dùng ảnh bitmap |
| `Toast` | Nổi trên tab bar 12px, nền `text`, chữ trắng, radius 12 | Tự ẩn 3s |

Hàng chip **luôn cuộn ngang một hàng** (`horizontal` + `showsHorizontalScrollIndicator=false`), nhãn `nowrap`, `maxWidth 220` + ellipsis; không để nhãn rơi xuống dòng thứ hai (UX rule *Compact Label Overflow*).

## 4. Đặc tả màn

### 4.1 Công việc

```
HÔM NAY                    [+]
Công việc
3 việc đang mở · 2 phiên hôm nay

[ Tất cả ][ Đang mở ][ Đã xong ][ Lưu trữ ]   ← cuộn ngang
[ Tất cả ][ Thiết kế ][ Lập trình ] …         ← cuộn ngang

┌▌ Thiết kế cây tháng từ seed          ┐
│▌ Thiết kế · S · 2 phiên   ● Đang mở  │
│▌                          Bắt đầu → │
└──────────────────────────────────────┘
```

- Vạch màu 4px bên trái theo loại việc (map cố định trong tokens).
- Tên việc tối đa 2 dòng; phần còn lại ellipsis.
- "Bắt đầu" mở tab Tập trung với việc đã chọn sẵn.
- Bỏ badge dev, bỏ dòng ghi chú kỹ thuật khỏi UI.

### 4.2 Tập trung

Chưa có phiên:

```
        Chọn việc để tập trung  ⌄
        ┌───────────────────┐
        │   ◜ 25:00 ◝       │   ← ring, số đếm ở giữa
        └───────────────────┘
              🌱  (cây trên mặt đất, dưới ring)
   [15] [25] [50] [90] phút      ← segmented, mặc định 25
        [   Bắt đầu phiên   ]
```

Đang chạy:

```
        Thiết kế cây tháng từ seed
        ┌───────────────────┐
        │   ◜ 18:42 ◝       │   ← đếm ngược
        └───────────────────┘
             🌿  (cây lớn dần theo %)
        18 / 25 phút · cây đang lớn
        [   Kết thúc sớm   ]        ← ghost, màu danger
```

- Cây nằm **dưới ring** trên một đường "mặt đất" mảnh, không chồng lên số đếm.

- "Kết thúc sớm" mở dialog: *"Cây sẽ héo và phiên không được tính. Kết thúc?"* → `[Ở lại]` `[Kết thúc]`.
- Kết thúc tự nhiên: card kết quả — cây đầy đủ, thời gian hiệu dụng, điểm chất lượng, `[Về vườn cây]` `[Phiên mới]`.
- Thời lượng chỉ chọn trong 900–5400 giây (15/25/50/90 phút).
- UI **không** tự tính thời gian hiệu dụng/điểm/chênh lệch — tất cả lấy từ BE.

### 4.3 Lịch sử

```
Lịch sử
Tuần này: 3g 20p · 4 cây

Hôm nay
  🌳 Hoàn thành      42 phút     88
  🥀 Kết thúc sớm    18 phút     61
Hôm qua
  …
```

- Cây sống = `primary/leaf`; cây héo = `danger` + nhãn "Kết thúc sớm".
- Điểm chất lượng hiển thị dạng badge nhỏ, có nhãn phụ "điểm".
- Nhóm theo ngày; ngày trống có empty state.
- Xoá badge `MVP · KIỂM CHỨNG` và dòng cảnh báo dev đỏ.

### 4.4 Vườn cây

```
Vườn của anh
3g 20p tập trung · 4 ngày liên tiếp · 12 cây

   ‹   Tháng 10 2026   ›

  🌳   🌳   🌿
  🌳   🥀   🌱
  🌳   🌳   🌳

 (chạm vào cây → xem phiên)
```

- Lưới 3 cột, mỗi ô ~104×120, cây theo seed + kích thước theo điểm chất lượng.
- Thay Skia bằng `react-native-svg` để chạy được web + Expo Go.
- Chạm cây mở sheet chi tiết phiên (thời lượng, điểm, trạng thái).

### 4.5 Hồ sơ

```
Hồ sơ
┌ (D)  Demo                    ┐
│ demo@focus.local             │
└──────────────────────────────┘
Thời lượng mặc định      25 phút ›
Múi giờ                Asia/Ho_Chi_Minh ›
[ Đăng xuất ]
Phiên bản 1.0.0
```

## 5. Kiểm tra trước khi giao

- [ ] Chữ/nền đạt 4.5:1; vàng chỉ dùng trang trí hoặc `accentStrong` cho chữ nhỏ.
- [ ] Mọi vùng bấm ≥ 44×44, có phản hồi khi nhấn (`Pressable` + opacity/ripple).
- [ ] Chip/badge không xuống dòng, không cắt mất chữ; có `accessibilityLabel` đầy đủ.
- [ ] Trạng thái không chỉ dựa vào màu (luôn kèm chữ/icon).
- [ ] Safe area trên/dưới; tab bar không che nội dung.
- [ ] Không còn nhãn dev (`MVP`, "chờ BE…") trong UI.
- [ ] `prefers-reduced-motion` / `reduceMotion` được tôn trọng.
- [ ] Ảnh chụp 390×844 cho cả 5 tab, không có lỗi runtime.

## 6. Ghi chú kỹ thuật

1. **Bỏ Skia**: `@shopify/react-native-skia` không chạy trong Expo Go (native module) và crash web (`CanvasKit is not defined`). Thay bằng `react-native-svg` (`expo install react-native-svg`) cho `Tree` và `ProgressRing`.
2. **Font**: thêm `@expo-google-fonts/nunito` + dùng `expo-font` (đã có). Chờ load font ở root, fallback system để không nháy chữ.
3. **Tokens**: mở rộng `src/theme/tokens.ts` (giữ nguyên key cũ, thêm key mới) + thêm `typography`, `shadow` (không dùng), `typeColors`.
4. **Component dùng chung**: `src/components/ui/` — `Screen`, `ScreenHeader`, `Card`, `Button`, `Chip`, `StatusPill`, `ProgressRing`, `Tree`, `EmptyState`, `Toast`.
5. **Lỗi cần sửa kèm**: mở thẳng `/focus` đang bị đẩy về `/tasks` (deep link sai). Sửa trong lát UI_01.
6. **Không đổi**: hợp đồng API, thời lượng hợp lệ, cách BE tính thời gian hiệu dụng/điểm chất lượng.

## 7. Lát giao việc

| Lát | Nội dung | Tiêu chí xong |
|---|---|---|
| UI_00 | Tokens + font + component nền (`Screen`, `ScreenHeader`, `Card`, `Button`, `Chip`, `StatusPill`, `EmptyState`) | 5 tab cũ vẫn chạy; test/tsc/lint xanh |
| UI_01 | Màn Tập trung (ring + cây + chọn thời lượng + dialog huỷ + màn kết quả) + fix deep link `/focus` | Bắt đầu/kết thúc phiên thật với BE; cây đổi giai đoạn đúng % |
| UI_02 | Vườn cây bằng SVG, bỏ Skia, lưới theo tháng, sheet chi tiết | Không còn crash web/Expo Go; ảnh chụp 390×844 |
| UI_03 | Công việc: header, chip cuộn ngang, card có vạch màu + nút bắt đầu | Không còn chip bị cắt; bắt đầu phiên từ card |
| UI_04 | Lịch sử + Hồ sơ: bỏ nhãn dev, nhóm theo ngày, badge điểm | Không còn chữ dev; dữ liệu thật/mock hiển thị rõ nguồn |
