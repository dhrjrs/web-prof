import { NextResponse, type NextRequest } from 'next/server'
import { changeAdminPassword } from '@/app/actions/auth'
import {
  deleteCategory,
  deleteCustomer,
  saveCategory,
  saveCustomer,
  saveGallonTotal,
} from '@/app/actions/customers'
import { borrowGallon, returnGallon } from '@/app/actions/gallons'
import { adjustStock, deleteProduct, saveProduct } from '@/app/actions/products'
import {
  addPayment,
  advanceSale,
  createSale,
  deleteSale,
  returnSaleItem,
  updateSale,
} from '@/app/actions/sales'
import { saveTaxSettings } from '@/app/actions/tax'
import {
  getDashboard,
  getGallonSummary,
  getNotaForEdit,
  getSale,
  listCategories,
  listCustomers,
  listGallonLoans,
  listNotas,
  listProducts,
  listSales,
  type NotaFilter,
} from '@/lib/queries'
import type { ActionResult } from '@/lib/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ path?: string[] }> }
type Mutation = (formData: FormData) => Promise<ActionResult>
type Method = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function parseId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

async function readBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null
    return body as Record<string, unknown>
  } catch {
    return null
  }
}

function toFormData(values: Record<string, unknown>, idField?: string, id?: string) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue
    formData.set(
      key,
      typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value),
    )
  }
  if (idField && id) formData.set(idField, id)
  return formData
}

async function runMutation(mutation: Mutation, body: Record<string, unknown>, idField?: string, id?: string) {
  const result = await mutation(toFormData(body, idField, id))
  if (result.ok) return NextResponse.json(result)
  return jsonError(result.error ?? 'Permintaan tidak dapat diproses', result.error === 'Terjadi kesalahan. Coba lagi.' ? 500 : 400)
}

async function getResource(request: NextRequest, path: string[]) {
  const [resource, id, action] = path
  const query = request.nextUrl.searchParams

  if (path.length === 1) {
    switch (resource) {
      case 'dashboard':
        return NextResponse.json(await getDashboard())
      case 'customers':
        return NextResponse.json(await listCustomers())
      case 'products':
        return NextResponse.json(await listProducts())
      case 'categories': {
        const type = query.get('type')
        if (type && type !== 'pelanggan' && type !== 'penjualan') {
          return jsonError('Tipe kategori tidak valid', 400)
        }
        return NextResponse.json(
          await listCategories(type === 'pelanggan' || type === 'penjualan' ? type : undefined),
        )
      }
      case 'sales': {
        const stage = query.get('stage')
        const stages = ['penawaran', 'pesanan', 'dikirim', 'faktur', 'lunas', 'batal']
        if (stage && !stages.includes(stage)) return jsonError('Tahap transaksi tidak valid', 400)
        return NextResponse.json(await listSales(stage ? (stage as Parameters<typeof listSales>[0]) : undefined))
      }
      case 'notas': {
        const from = query.get('from') || undefined
        const to = query.get('to') || undefined
        const rawCustomerId = query.get('customerId')
        const customerId = rawCustomerId ? parseId(rawCustomerId) : undefined
        if (rawCustomerId && customerId === null) return jsonError('ID pelanggan tidak valid', 400)
        return NextResponse.json(
          await listNotas({ from, to, customerId: customerId ?? undefined } satisfies NotaFilter),
        )
      }
      case 'gallon-summary':
        return NextResponse.json(await getGallonSummary())
      case 'gallon-loans': {
        const active = query.get('active')
        if (active !== 'true' && active !== 'false') {
          return jsonError('Parameter active harus bernilai true atau false', 400)
        }
        return NextResponse.json(await listGallonLoans(active === 'true'))
      }
      default:
        return null
    }
  }

  if (resource === 'sales' && id && path.length === 2) {
    const saleId = parseId(id)
    if (saleId === null) return jsonError('ID transaksi tidak valid', 400)
    const sale = await getSale(saleId)
    return sale ? NextResponse.json(sale) : jsonError('Transaksi tidak ditemukan', 404)
  }

  if (resource === 'notas' && id && action === 'edit' && path.length === 3) {
    const notaId = parseId(id)
    if (notaId === null) return jsonError('ID nota tidak valid', 400)
    const nota = await getNotaForEdit(notaId)
    return nota ? NextResponse.json(nota) : jsonError('Nota tidak ditemukan', 404)
  }

  return null
}

function mutationFor(method: Method, path: string[]): { mutation: Mutation; idField?: string; id?: string } | null {
  const [resource, id, action] = path
  if (method === 'POST' && resource === 'settings' && id === 'gallon-total' && path.length === 2) {
    return { mutation: saveGallonTotal }
  }
  if (method === 'POST' && resource === 'settings' && id === 'password' && path.length === 2) {
    return { mutation: changeAdminPassword }
  }
  if (method === 'POST' && resource === 'settings' && id === 'tax' && path.length === 2) {
    return { mutation: saveTaxSettings }
  }

  if (path.length === 1) {
    if (method === 'POST' && resource === 'customers') return { mutation: saveCustomer }
    if (method === 'POST' && resource === 'categories') return { mutation: saveCategory }
    if (method === 'POST' && resource === 'products') return { mutation: saveProduct }
    if (method === 'POST' && resource === 'gallon-loans') return { mutation: borrowGallon }
    if (method === 'POST' && resource === 'sales') return { mutation: createSale }
  }

  if (id && path.length === 2) {
    if (method === 'PUT' && resource === 'customers') return { mutation: saveCustomer, idField: 'id', id }
    if (method === 'DELETE' && resource === 'customers') return { mutation: deleteCustomer, idField: 'id', id }
    if (method === 'PUT' && resource === 'products') return { mutation: saveProduct, idField: 'id', id }
    if (method === 'DELETE' && resource === 'products') return { mutation: deleteProduct, idField: 'id', id }
    if (method === 'DELETE' && resource === 'categories') return { mutation: deleteCategory, idField: 'id', id }
    if (method === 'PUT' && resource === 'sales') return { mutation: updateSale, idField: 'id', id }
    if (method === 'DELETE' && resource === 'sales') return { mutation: deleteSale, idField: 'id', id }
  }

  if (id && action && path.length === 3) {
    if (method === 'PATCH' && resource === 'products' && action === 'stock') {
      return { mutation: adjustStock, idField: 'id', id }
    }
    if (method === 'POST' && resource === 'gallon-loans' && action === 'returns') {
      return { mutation: returnGallon, idField: 'id', id }
    }
    if (method === 'POST' && resource === 'sales' && action === 'stage') {
      return { mutation: advanceSale, idField: 'id', id }
    }
    if (method === 'POST' && resource === 'sales' && action === 'payments') {
      return { mutation: addPayment, idField: 'saleId', id }
    }
    if (method === 'POST' && resource === 'sale-items' && action === 'returns') {
      return { mutation: returnSaleItem, idField: 'saleItemId', id }
    }
  }

  return null
}

async function handle(request: NextRequest, method: 'GET' | Method, context: RouteContext) {
  const { path = [] } = await context.params
  try {
    if (method === 'GET') {
      const response = await getResource(request, path)
      return response ?? jsonError('Endpoint tidak ditemukan', 404)
    }

    const selected = mutationFor(method, path)
    if (!selected) return jsonError('Endpoint atau metode tidak ditemukan', 404)
    const body = method === 'DELETE' ? {} : await readBody(request)
    if (!body) return jsonError('Body harus berupa objek JSON yang valid', 400)
    return await runMutation(selected.mutation, body, selected.idField, selected.id)
  } catch (error) {
    console.error('[api] request failed', error)
    return jsonError('Terjadi kesalahan pada server', 500)
  }
}

export function GET(request: NextRequest, context: RouteContext) {
  return handle(request, 'GET', context)
}

export function POST(request: NextRequest, context: RouteContext) {
  return handle(request, 'POST', context)
}

export function PUT(request: NextRequest, context: RouteContext) {
  return handle(request, 'PUT', context)
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return handle(request, 'PATCH', context)
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return handle(request, 'DELETE', context)
}
