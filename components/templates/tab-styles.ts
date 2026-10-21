/**
 * Hàng tab GẠCH CHÂN của màn soạn template (bản phác Main) — dùng chung hàng tab chính và tab con (Tích hợp).
 * Một hàng, điện thoại cuộn ngang thay vì xuống dòng. Viền dưới của tab đang chọn là `after:` của `TabsTrigger` — KHÔNG
 * dùng `border`: `* { border-color }` của globals.css (ngoài layer) thắng mọi `border-transparent`, tab nào cũng thành
 * ô có viền. Dùng với `<TabsList variant="line">`.
 */
export const UNDERLINE_TAB_LIST =
  'h-11 w-full justify-start gap-5 overflow-x-auto overflow-y-hidden rounded-none p-0 [scrollbar-width:none] group-data-horizontal/tabs:h-11 md:gap-6'
export const UNDERLINE_TAB_TRIGGER =
  'h-full flex-none rounded-none border-0 px-0.5 data-active:text-[var(--starlight)] after:bg-[var(--starlight)] group-data-horizontal/tabs:after:bottom-0'
