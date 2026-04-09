import React from 'react'

const HANDLE_SIZE = 7
const HALF = HANDLE_SIZE / 2

export type ResizeHandle =
  | 'nw' | 'n' | 'ne'
  | 'w'          | 'e'
  | 'sw' | 's' | 'se'

interface HandleDef {
  id: ResizeHandle
  cx: (w: number, h: number) => number
  cy: (w: number, h: number) => number
  cursor: string
}

const HANDLES: HandleDef[] = [
  { id: 'nw', cx: () => 0,       cy: () => 0,       cursor: 'nw-resize' },
  { id: 'n',  cx: (w) => w / 2,  cy: () => 0,       cursor: 'n-resize'  },
  { id: 'ne', cx: (w) => w,      cy: () => 0,       cursor: 'ne-resize' },
  { id: 'w',  cx: () => 0,       cy: (_,h) => h/2,  cursor: 'w-resize'  },
  { id: 'e',  cx: (w) => w,      cy: (_,h) => h/2,  cursor: 'e-resize'  },
  { id: 'sw', cx: () => 0,       cy: (_,h) => h,    cursor: 'sw-resize' },
  { id: 's',  cx: (w) => w / 2,  cy: (_,h) => h,    cursor: 's-resize'  },
  { id: 'se', cx: (w) => w,      cy: (_,h) => h,    cursor: 'se-resize' },
]

interface Props {
  w: number
  h: number
  onHandleMouseDown: (handle: ResizeHandle, e: React.MouseEvent) => void
}

export const ResizeHandles: React.FC<Props> = ({ w, h, onHandleMouseDown }) => (
  <>
    {HANDLES.map(hd => (
      <rect
        key={hd.id}
        x={hd.cx(w, h) - HALF}
        y={hd.cy(w, h) - HALF}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        rx={2}
        fill="var(--bg-panel)"
        stroke="var(--accent)"
        strokeWidth={1.5}
        style={{ cursor: hd.cursor }}
        onMouseDown={e => { e.stopPropagation(); onHandleMouseDown(hd.id, e) }}
      />
    ))}
  </>
)
