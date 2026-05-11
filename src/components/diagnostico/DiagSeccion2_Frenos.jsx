import DiagSectionBase from './DiagSectionBase'
import { getDiagSeccion } from './checklistData'

export default function DiagSeccion2_Frenos(props) {
  return <DiagSectionBase config={getDiagSeccion(2)} {...props} />
}
