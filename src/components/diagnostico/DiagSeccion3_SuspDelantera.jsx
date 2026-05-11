import DiagSectionBase from './DiagSectionBase'
import { getDiagSeccion } from './checklistData'

export default function DiagSeccion3_SuspDelantera(props) {
  return <DiagSectionBase config={getDiagSeccion(3)} {...props} />
}
