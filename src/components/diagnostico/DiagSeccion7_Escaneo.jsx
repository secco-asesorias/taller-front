import DiagSectionBase from './DiagSectionBase'
import { getDiagSeccion } from './checklistData'

export default function DiagSeccion7_Escaneo(props) {
  return <DiagSectionBase config={getDiagSeccion(7)} {...props} />
}
