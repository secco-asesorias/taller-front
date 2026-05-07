import DiagSectionBase from './DiagSectionBase'
import { getDiagSeccion } from './checklistData'

export default function DiagSeccion1_Motor(props) {
  return <DiagSectionBase config={getDiagSeccion(1)} {...props} />
}
