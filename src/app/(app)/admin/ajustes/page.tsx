import { EditorAjustes } from '@/components/admin/ajustes'
import { crmConfigurado } from '@/server/crm'
import { leerAjustes } from '@/server/datos'
import { hayIA } from '@/server/ia/motor'

export default async function Ajustes() {
  const ajustes = await leerAjustes()
  return (
    <EditorAjustes
      inicial={ajustes}
      estado={{
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        openai: Boolean(process.env.OPENAI_API_KEY),
        ia: hayIA(),
        crm: crmConfigurado(),
        crmUrl: process.env.CRM_WEBHOOK_URL ?? '',
      }}
    />
  )
}
