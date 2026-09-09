import { LogoMark } from '../components/icons'
import { Brand } from '../components/shared'

export default function Stub({ title }: { title: string }) {
  return (
    <div className="screen">
      <div className="top-row">
        <Brand />
      </div>
      <div className="stub">
        <LogoMark size={44} muted />
        <h2>{title}</h2>
        <p>Not designed yet — this prototype covers the core attendee flows.</p>
      </div>
    </div>
  )
}
