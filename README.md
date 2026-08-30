# Mô phỏng Chiêm tinh Vệ Đà

Ứng dụng web tĩnh, tương tác để quan sát bầu trời Jyotish theo hệ **sidereal Lahiri**. Ứng dụng chạy hoàn toàn trong trình duyệt và được xuất bản bằng GitHub Pages.

**Trang đang chạy:** https://kimminhpro.github.io/mo-phong-chiem-tinh-ve-da/

## Tính năng

- Tính Navagraha với Swiss Ephemeris ngay trên thiết bị.
- Bầu trời 3D tương tác bằng Three.js và chế độ vòng tròn 2D dự phòng.
- Lagna, 12 bhāva Whole Sign, lá số D1 kiểu Nam Ấn, 27 Nakshatra và 108 pāda.
- Chọn thành phố, nhập tọa độ/múi giờ, dùng vị trí thiết bị và chia sẻ liên kết đang xem.
- Điều khiển thời gian và mô phỏng chuyển động hành tinh.

Không có máy chủ, cơ sở dữ liệu hoặc tài khoản người dùng. Dữ liệu vị trí và thời điểm chỉ được dùng cục bộ trong trình duyệt.

## Chạy trên máy

Yêu cầu Node.js 22 trở lên.

```bash
npm install
npm run dev
```

Mở http://localhost:3000 để xem ứng dụng.

## Kiểm tra trước khi đưa lên GitHub

```bash
npm run lint
npm test
```

`npm test` tạo bản xuất tĩnh trong `out/` và xác nhận trang cùng các tệp Swiss Ephemeris cần thiết đã có mặt.

## Triển khai GitHub Pages

Mỗi lần đẩy thay đổi lên nhánh `main`, GitHub Actions sẽ:

1. Cài đặt dependencies bằng `npm ci`.
2. Xuất Next.js thành các tệp tĩnh.
3. Đưa thư mục `out/` lên GitHub Pages.

Quy trình nằm tại `.github/workflows/deploy-pages.yml`. Repository phải bật **Settings → Pages → Source: GitHub Actions** một lần trước lần triển khai đầu tiên.

## Cấu trúc chính

- `app/JyotishOrbit.tsx`: trạng thái ứng dụng, điều khiển thời gian và UI.
- `app/ThreeSky.tsx`: cảnh bầu trời 3D.
- `app/swiss.ts`: nạp Swiss Ephemeris và tính vị trí các graha.
- `app/observer.ts`: địa điểm, múi giờ và định dạng thời gian.
- `public/`: WebAssembly và dữ liệu ephemeris được phục vụ cùng ứng dụng.

## Ghi chú giấy phép

Swiss Ephemeris được phân phối theo AGPL-3.0. Hãy xem giấy phép của `@swisseph/browser` và Swiss Ephemeris trước khi tái phân phối hoặc tích hợp ứng dụng vào một sản phẩm khác.
