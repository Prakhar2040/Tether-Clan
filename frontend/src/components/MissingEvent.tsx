import { useNavigate } from 'react-router-dom'

// Event lists come from the server, but event details are still local sample
// data. An id the sample does not know lands here rather than on a blank page.
export function MissingEvent() {
  const navigate = useNavigate()
  return (
    <div className="screen no-bar">
      <div className="no-match">
        <span className="t">Details for this plan are not available yet</span>
        <span className="s">The listing is live; the full page is still being built.</span>
        <button className="btn btn-ghost" style={{ flex: 'none', padding: '0 18px' }} onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    </div>
  )
}
