/**
 * Chữ của giao diện GrapesJS trong bộ soạn trực quan. Tiếng Việt lấy gói `grapesjs/locale/vi` có sẵn rồi
 * đè vài chỗ cho người không biết code (nhãn ô thuộc tính, ô link ảnh chỉ https). Chữ của phần console tự
 * dựng (bảng, nút, hộp thoại) vẫn ở `messages/*.json` nhóm `visualEditor`.
 */

type Messages = Record<string, unknown>

const VI_OVERRIDES: Messages = {
  assetManager: {
    addButton: 'Dùng link ảnh',
    inputPlh: 'https://… (chỉ link https)',
    modalTitle: 'Ảnh',
    uploadTitle: 'Dán link ảnh https:// vào ô bên trên',
  },
  traitManager: {
    empty: 'Chọn một khối trong thư để chỉnh.',
    label: 'Cài đặt khối',
    traits: {
      labels: { href: 'Liên kết', alt: 'Mô tả ảnh', title: 'Chú thích khi rê chuột', target: 'Mở ở', rel: 'rel' },
    },
  },
  styleManager: { empty: 'Chọn một khối trong thư để chỉnh kiểu chữ, màu, khoảng cách.' },
  // Nhãn khối hiện trên khung soạn (badge khi rê / chọn) — grapesjs-mjml chỉ có tiếng Anh.
  'grapesjs-mjml': {
    components: {
      names: {
        body: 'Thân thư',
        button: 'Nút',
        column: 'Cột',
        oneColumn: '1 cột',
        twoColumn: '2 cột',
        threeColumn: '3 cột',
        divider: 'Đường kẻ',
        group: 'Nhóm cột',
        hero: 'Ảnh lớn',
        image: 'Ảnh',
        navBar: 'Menu',
        navLink: 'Mục menu',
        section: 'Hàng',
        socialGroup: 'Mạng xã hội',
        socialElement: 'Mạng xã hội',
        spacer: 'Khoảng trống',
        text: 'Đoạn chữ',
        wrapper: 'Vùng bọc',
        raw: 'Mã HTML',
      },
    },
  },
}

const EN_OVERRIDES: Messages = {
  assetManager: {
    addButton: 'Use image link',
    inputPlh: 'https://… (https links only)',
    modalTitle: 'Image',
    uploadTitle: 'Paste an https:// image link above',
  },
  traitManager: {
    empty: 'Select a block in the email to edit it.',
    label: 'Block settings',
    traits: {
      labels: { href: 'Link', alt: 'Image description', title: 'Hover text', target: 'Open in', rel: 'rel' },
    },
  },
  styleManager: { empty: 'Select a block in the email to change its font, colours and spacing.' },
}

/** Trộn sâu `extra` vào `base` (không sửa hai object gốc). */
function merge(base: Messages, extra: Messages): Messages {
  const out: Messages = { ...base }
  for (const [key, value] of Object.entries(extra)) {
    const prev = out[key]
    out[key] =
      value && typeof value === 'object' && !Array.isArray(value) && prev && typeof prev === 'object'
        ? merge(prev as Messages, value as Messages)
        : value
  }
  return out
}

export function grapesMessages(vi: Messages): Record<string, Messages> {
  return { vi: merge(vi, VI_OVERRIDES), en: EN_OVERRIDES }
}
