import DiagSectionBase from './DiagSectionBase'
import { getDiagSeccion } from './checklistData'

export default function DiagSeccion8_PruebaRuta(props) {
  return <DiagSectionBase config={getDiagSeccion(8)} {...props} />
}
