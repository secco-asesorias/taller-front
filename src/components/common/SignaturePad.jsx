import { useRef, useEffect, useState } from 'react'

export default function SignaturePad({ onChange, label = 'Firma' }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const lastPos = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#a98225'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches ? e.touches[0] : e
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  function startDraw(e) {
    e.preventDefault()
    setDrawing(true)
    lastPos.current = getPos(e, canvasRef.current)
  }

  function draw(e) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
    setIsEmpty(false)
  }

  function endDraw(e) {
    e.preventDefault()
    setDrawing(false)
    if (!isEmpty) onChange(canvasRef.current.toDataURL('image/png'))
  }

  function clear() {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
    onChange(null)
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="s-label" style={{ marginBottom: 0 }}>{label}</span>
        {!isEmpty && (
          <button
            type="button"
            onClick={clear}
            style={{ color: '#FF453A', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Borrar
          </button>
        )}
      </div>

      <div
        style={{
          position: 'relative',
          background: '#FFFFFF',
          border: '1.5px solid #E0E0E0',
          borderRadius: 12,
          overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        {isEmpty && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span style={{ color: '#AAAAAA', fontSize: 14 }}>Firme aquí con el dedo</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          style={{ width: '100%', height: 144, cursor: 'crosshair', display: 'block' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
    </div>
  )
}
