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

/** Nhãn khối của grapesjs-mjml (gói đó không có tiếng Việt). */
export function mjmlBlockLabels(locale: string): Record<string, string> {
  return locale === 'vi'
    ? {
        'mj-1-column': '1 cột',
        'mj-2-columns': '2 cột',
        'mj-3-columns': '3 cột',
        'mj-text': 'Đoạn chữ',
        'mj-button': 'Nút',
        'mj-image': 'Ảnh',
        'mj-divider': 'Đường kẻ',
        'mj-spacer': 'Khoảng trống',
      }
    : {
        'mj-1-column': '1 column',
        'mj-2-columns': '2 columns',
        'mj-3-columns': '3 columns',
        'mj-text': 'Text',
        'mj-button': 'Button',
        'mj-image': 'Image',
        'mj-divider': 'Divider',
        'mj-spacer': 'Spacer',
      }
}
