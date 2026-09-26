// A section that exists in the rail but is not built yet. Says what it will
// do, so the shape of the console is legible before the work lands.
export default function Soon({ title, body, points }: { title: string; body: string; points: string[] }) {
  return (
    <div className="soon">
      <span className="soon-tag">Yet to come</span>
      <span className="soon-title">{title}</span>
      <p className="soon-body">{body}</p>
      <div className="soon-list">
        {points.map((p) => (
          <span className="soon-item" key={p}>
            <span className="soon-dot" />
            <span>{p}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
