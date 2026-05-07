import DiagSectionBase from './DiagSectionBase'
import { getDiagSeccion } from './checklistData'

export default function DiagSeccion6_Neumaticos(props) {
  return <DiagSectionBase config={getDiagSeccion(6)} {...props} />
}
