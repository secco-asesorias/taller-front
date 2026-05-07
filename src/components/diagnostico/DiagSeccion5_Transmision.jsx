import DiagSectionBase from './DiagSectionBase'
import { getDiagSeccion } from './checklistData'

export default function DiagSeccion5_Transmision(props) {
  return <DiagSectionBase config={getDiagSeccion(5)} {...props} />
}
