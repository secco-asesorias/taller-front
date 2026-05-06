import DiagSectionBase from './DiagSectionBase'
import { getDiagSeccion } from './checklistData'

export default function DiagSeccion4_SuspTrasera(props) {
  return <DiagSectionBase config={getDiagSeccion(4)} {...props} />
}
