import React, { useCallback } from 'react'
import { useGraphStore } from '../../store/graphStore'
import { useUIStore } from '../../store/uiStore'
import { getBoundingBox } from '../../utils/geometry'
import { NODE_TYPE_CONFIGS } from '../../constants/nodeTypes'

const MAP_W = 180
const MAP_H = 120
const PADDING = 60

interface Props {
  canvasSize: { w: number; h: number }
}

export const Minimap: React.FC<Props> = ({ canvasSize }) => {
  const { nodes } = useGraphStore()
  const { viewport, setViewport } = useUIStore()
  const nodeList = Object.values(nodes)

  if (!nodeList.length) return null

  const bb = getBoundingBox(nodeList)
  if (!bb) return null

  const gx = bb.x - PADDING
  const gy = bb.y - PADDING
  const gw = bb.w + PADDING * 2
  const gh = bb.h + PADDING * 2

  const scaleX = MAP_W / gw
  const scaleY = MAP_H / gh
  const scale = Math.min(scaleX, scaleY)

  const offsetX = (MAP_W - gw * scale) / 2
  const offsetY = (MAP_H - gh * scale) / 2

  const toMap = (x: number, y: number) => ({
    x: (x - gx) * scale + offsetX,
    y: (y - gy) * scale + offsetY,
  })

  const vpLeft   = -viewport.x / viewport.zoom
  const vpTop    = -viewport.y / viewport.zoom
  const vpWidth  = canvasSize.w / viewport.zoom
  const vpHeight = canvasSize.h / viewport.zoom

  const vpM = toMap(vpLeft, vpTop)
  const vpMW = vpWidth * scale
  const vpMH = vpHeight * scale

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    const mx = e.clientX - rect.left - offsetX
    const my = e.clientY - rect.top - offsetY
    const gxClick = mx / scale + gx
    const gyClick = my / scale + gy
    setViewport({
      x: -gxClick * viewport.zoom + canvasSize.w / 2,
      y: -gyClick * viewport.zoom + canvasSize.h / 2,
    })
  }, [scale, gx, gy, offsetX, offsetY, viewport.zoom, canvasSize])

  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16,
      background: 'var(--minimap-bg)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 4px 20px var(--shadow)',
      backdropFilter: 'blur(8px)',
      zIndex: 100,
    }}>
      <svg
        width={MAP_W} height={MAP_H}
        style={{ display: 'block', cursor: 'crosshair' }}
        onClick={handleClick}
      >
        <rect width={MAP_W} height={MAP_H} fill="transparent" />

        {nodeList.map(n => {
          const mp = toMap(n.position.x, n.position.y)
          const mw = Math.max(n.size.w * scale, 2)
          const mh = Math.max(n.size.h * scale, 2)
          const cfg = NODE_TYPE_CONFIGS[n.type]
          return (
            <rect key={n.id} x={mp.x} y={mp.y} width={mw} height={mh}
              rx={1} fill={cfg.defaultBorder} opacity={0.5} />
          )
        })}

        {/* Viewport indicator */}
        <rect
          x={vpM.x} y={vpM.y}
          width={Math.max(vpMW, 4)} height={Math.max(vpMH, 4)}
          fill="var(--accent-subtle)"
          stroke="var(--accent)"
          strokeWidth={1}
          opacity={0.7}
          rx={2}
        />
      </svg>
    </div>
  )
}
