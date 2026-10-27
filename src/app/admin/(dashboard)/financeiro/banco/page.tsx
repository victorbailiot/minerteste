'use client'

import { useCallback, useMemo, useState } from 'react'
import { Landmark, RefreshCw, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type {
  ConsultaExtratoResponse,
  ConsultaSaldoResponse,
  LancamentoExtratoPeriodo,
  ListaLancamentosExtrato,
} from '@/model/bradesco-contas'

type SaldoApi = { success: boolean; data: ConsultaSaldoResponse }
type ExtratoApi = { success: boolean; data: ConsultaExtratoResponse }

const defaultExtratoRange = (): { inicio: string; fim: string } => {
  const fim = new Date()
  const inicio = new Date(fim)
  inicio.setDate(inicio.getDate() - 1)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { inicio: fmt(inicio), fim: fmt(fim) }
}

/** Ordenação cronológica (valor maior = data mais recente). */
const timestampDataLancamento = (s: string | undefined | null): number => {
  if (s == null || !String(s).trim()) return 0
  const t = String(s).trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t)
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime()
  }
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t)
  if (br) {
    return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1])).getTime()
  }
  if (/^\d{8}$/.test(t)) {
    return new Date(Number(t.slice(4, 8)), Number(t.slice(2, 4)) - 1, Number(t.slice(0, 2))).getTime()
  }
  return 0
}

/** C = crédito (entrada), D = débito (saída) — convenção usual em extratos Bradesco. */
type MovimentoExtrato = 'entrada' | 'saida' | 'desconhecido'

/** Linha exibida na tabela: período (API) ou blocos listaLancamentos (últimos / futuros). */
type LancamentoTabela = LancamentoExtratoPeriodo | ListaLancamentosExtrato[string][number]

const flattenListaLancamentos = (map: ListaLancamentosExtrato | null | undefined): LancamentoTabela[] => {
  if (map == null || typeof map !== 'object') return []
  const out: LancamentoTabela[] = []
  for (const k of Object.keys(map)) {
    const arr = map[k]
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      if (item != null && typeof item === 'object') out.push(item)
    }
  }
  return out
}

const classifyMovimentoExtrato = (row: LancamentoTabela): MovimentoExtrato => {
  const raw = (row.sinalLancamento ?? '').trim()
  if (!raw) return 'desconhecido'
  const n = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  if (n === 'C' || n === '+' || n === 'CREDITO' || n.startsWith('CRED')) return 'entrada'
  if (n === 'D' || n === '-' || n === 'DEBITO' || n.startsWith('DEB')) return 'saida'
  return 'desconhecido'
}

const rowClassMovimento = (mov: MovimentoExtrato): string => {
  if (mov === 'entrada') return 'border-t border-gray-100 bg-green-50 hover:bg-green-100/90'
  if (mov === 'saida') return 'border-t border-gray-100 bg-red-50 hover:bg-red-100/90'
  return 'border-t border-gray-100 bg-white hover:bg-gray-50'
}

const SaldoBloco: React.FC<{ titulo: string; dados: ConsultaSaldoResponse['saldoCC'] }> = ({
  titulo,
  dados,
}) => {
  if (!dados) return null
  const linhas = dados.lstLancamentosSaldos ?? []
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-gray-800">{titulo}</h3>
      <p className="mb-3 text-xs text-gray-500">
        {dados.mensagem ?? ''}
        {dados.codigoRetorno != null ? ` (código ${dados.codigoRetorno})` : ''}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
              <th className="py-2 pr-2">Produto</th>
              <th className="py-2 pr-2">Valor</th>
              <th className="py-2">Sinal</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((r, i) => (
              <tr key={`${r.codigoProduto}-${i}`} className="border-b border-gray-50">
                <td className="py-2 pr-2 text-gray-800">{r.nomeProdutoResumido ?? r.nomeProduto}</td>
                <td className="py-2 pr-2 text-gray-800">{r.valorLancamento ?? '—'}</td>
                <td className="py-2 text-gray-600">{r.sinalSaldo ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AdminBancoBradescoPage() {
  const [saldoLoading, setSaldoLoading] = useState(false)
  const [extratoLoading, setExtratoLoading] = useState(false)
  const [saldo, setSaldo] = useState<ConsultaSaldoResponse | null>(null)
  const [extrato, setExtrato] = useState<ConsultaExtratoResponse | null>(null)

  const range = useMemo(() => defaultExtratoRange(), [])
  const [dataInicio, setDataInicio] = useState(range.inicio)
  const [dataFim, setDataFim] = useState(range.fim)
  const [tipoConta, setTipoConta] = useState('cc')

  const fetchSaldo = useCallback(async () => {
    setSaldoLoading(true)
    try {
      const res = await fetch('/api/admin/bradesco/saldo')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof json.error === 'string' ? json.error : 'Falha ao consultar saldo')
        return
      }
      const body = json as SaldoApi
      if (body.success && body.data) {
        setSaldo(body.data)
        toast.success('Saldo atualizado')
      }
    } catch {
      toast.error('Erro de rede ao consultar saldo')
    } finally {
      setSaldoLoading(false)
    }
  }, [])

  const fetchExtrato = useCallback(async () => {
    setExtratoLoading(true)
    try {
      const q = new URLSearchParams({
        dataInicio,
        dataFim,
        tipo: tipoConta,
      })
      const res = await fetch(`/api/admin/bradesco/extrato?${q.toString()}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof json.error === 'string' ? json.error : 'Falha ao consultar extrato')
        return
      }
      const body = json as ExtratoApi
      if (body.success && body.data) {
        setExtrato(body.data)
        toast.success('Extrato carregado')
      }
    } catch {
      toast.error('Erro de rede ao consultar extrato')
    } finally {
      setExtratoLoading(false)
    }
  }, [dataInicio, dataFim, tipoConta])

  const lancamentosPeriodo = useMemo(() => {
    const periodo = extrato?.extratoPorPeriodo?.lstLancamentoMensal ?? []
    const ultimos = flattenListaLancamentos(extrato?.extratoUltimosLancamentos?.listaLancamentos ?? undefined)
    const futuros = flattenListaLancamentos(extrato?.extratoLancamentosFuturos?.listaLancamentos ?? undefined)
    const raw: LancamentoTabela[] = [...periodo, ...ultimos, ...futuros]
    const sorted = [...raw].sort(
      (a, b) => timestampDataLancamento(b.dataLancamento) - timestampDataLancamento(a.dataLancamento)
    )
    return sorted
  }, [extrato])

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Landmark className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Banco — Bradesco</h1>
              <p className="text-sm text-gray-600">
                Consulta de saldo e extrato
              </p>
            </div>
          </div>
        </header>

        <Card>
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <RefreshCw className="h-5 w-5 text-blue-600" aria-hidden />
                Saldo
              </h2>
              <button
                type="button"
                onClick={fetchSaldo}
                disabled={saldoLoading}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                tabIndex={0}
                aria-busy={saldoLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    fetchSaldo()
                  }
                }}
              >
                {saldoLoading ? 'Consultando…' : 'Consultar saldo'}
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {!saldo ? (
              <p className="text-sm text-gray-500">Clique em &quot;Consultar saldo&quot; para carregar.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <SaldoBloco titulo="Conta corrente (saldoCC)" dados={saldo.saldoCC} />
                <SaldoBloco titulo="Conta poupança (saldoCP)" dados={saldo.saldoCP} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <FileText className="h-5 w-5 text-blue-600" aria-hidden />
                Extrato por período
              </h2>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600">Data início</span>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600">Data fim</span>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-600">Tipo</span>
                  <select
                    value={tipoConta}
                    onChange={(e) => setTipoConta(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  >
                    <option value="cc">Conta corrente (cc)</option>
                    <option value="cp">Poupança (cp)</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={fetchExtrato}
                  disabled={extratoLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:mb-0"
                  tabIndex={0}
                  aria-busy={extratoLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      fetchExtrato()
                    }
                  }}
                >
                  {extratoLoading ? 'Consultando…' : 'Consultar extrato'}
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {lancamentosPeriodo.length === 0 ? (
              <p className="text-sm text-gray-500">
                Defina o período e clique em &quot;Consultar extrato&quot;.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-600">
                  <span className="mr-3 inline-flex items-center gap-1.5">
                    <span className="inline-block h-3 w-6 rounded bg-green-100 ring-1 ring-green-200" aria-hidden />
                    Entrada (crédito)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-3 w-6 rounded bg-red-100 ring-1 ring-red-200" aria-hidden />
                    Saída (débito)
                  </span>
                </p>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                      <tr>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Data</th>
                        <th className="px-3 py-2">Histórico</th>
                        <th className="px-3 py-2">Documento</th>
                        <th className="px-3 py-2">Valor</th>
                        <th className="px-3 py-2">Saldo após</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lancamentosPeriodo.map((row, idx) => {
                        const mov = classifyMovimentoExtrato(row)
                        const tipoLabel =
                          mov === 'entrada' ? 'Entrada' : mov === 'saida' ? 'Saída' : '—'
                        return (
                          <tr
                            key={`${row.numeroDocumento}-${idx}`}
                            className={rowClassMovimento(mov)}
                            aria-label={
                              mov === 'entrada'
                                ? 'Lançamento de entrada (crédito)'
                                : mov === 'saida'
                                  ? 'Lançamento de saída (débito)'
                                  : 'Lançamento'
                            }
                          >
                            <td className="whitespace-nowrap px-3 py-2">
                              <span
                                className={
                                  mov === 'entrada'
                                    ? 'rounded-full bg-green-200/80 px-2 py-0.5 text-xs font-medium text-green-900'
                                    : mov === 'saida'
                                      ? 'rounded-full bg-red-200/80 px-2 py-0.5 text-xs font-medium text-red-900'
                                      : 'text-xs text-gray-500'
                                }
                              >
                                {tipoLabel}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-800">{row.dataLancamento}</td>
                            <td className="max-w-xs px-3 py-2 align-top text-gray-800">
                              <div className="flex flex-col gap-1">
                                {row.segundaLinhalLancamento?.trim() ? (
                                  <>
                                    <p className="text-sm font-semibold leading-snug text-gray-900">
                                      {row.segundaLinhalLancamento}
                                    </p>
                                    {(row.descritivoLancamentoCompleto ?? row.descritivoLancamentoAbreviado)?.trim() ? (
                                      <p className="text-xs leading-snug text-gray-600">
                                        {row.descritivoLancamentoCompleto ?? row.descritivoLancamentoAbreviado}
                                      </p>
                                    ) : null}
                                  </>
                                ) : (
                                  <p className="text-sm leading-snug text-gray-800">
                                    {row.descritivoLancamentoCompleto ?? row.descritivoLancamentoAbreviado ?? '—'}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-gray-700">{row.numeroDocumento}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">{row.valorLancamento}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-800">
                              {row.valorSaldoAposLancamento}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
