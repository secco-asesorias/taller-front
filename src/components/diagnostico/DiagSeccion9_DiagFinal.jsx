import DiagSectionBase from './DiagSectionBase'
import { getDiagSeccion } from './checklistData'

export default function DiagSeccion9_DiagFinal(props) {
  return <DiagSectionBase config={getDiagSeccion(9)} nextLabel="Finalizar diagnóstico" {...props} />
}
