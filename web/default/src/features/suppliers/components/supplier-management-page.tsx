import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import {
  useSuppliers,
  useUpsertSupplier,
  useDeleteSupplier,
} from '../hooks/use-supplier'
import {
  useSupplierChannels,
  useCreateSupplierChannel,
  useDeleteSupplierChannel,
  useSupplierChannelPrices,
  useUpdateSupplierChannelPrices,
  useParseSupplierLog,
} from '../hooks/use-supplier-channel'
import type {
  Supplier,
  SupplierChannel,
  SupplierModelCost,
  SupplierModelPrice,
} from '../types'

// ---------------------------------------------------------------------------
// Supplier List (left panel)
// ---------------------------------------------------------------------------

function SupplierList({
  suppliers,
  selectedId,
  onSelect,
}: {
  suppliers: Supplier[]
  selectedId: number
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation()
  const upsert = useUpsertSupplier()
  const deleteMut = useDeleteSupplier()
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const create = () => {
    if (!newName.trim()) return
    upsert.mutate(
      {
        name: newName.trim(),
        display_currency: 'USD',
        settlement_currency: 'CNY',
        quote_unit_to_cny_rate: 1,
        official_usd_to_cny_rate: 7.2,
      },
      {
        onSuccess: (res) => {
          if (res.data?.id) onSelect(res.data.id)
          setNewName('')
          setCreateOpen(false)
        },
      }
    )
  }

  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-3'>
        <CardTitle className='text-sm font-medium'>
          {t('Suppliers')}
        </CardTitle>
        <Button variant='outline' size='sm' onClick={() => setCreateOpen(true)}>
          <Plus className='mr-1 h-4 w-4' />
          {t('New')}
        </Button>
      </CardHeader>
      <ScrollArea className='flex-1'>
        <div className='space-y-1 px-3 pb-3'>
          {suppliers.map((s) => (
            <div
              key={s.id}
              className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm ${
                s.id === selectedId
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted'
              }`}
              onClick={() => s.id && onSelect(s.id)}
            >
              <span className='truncate'>{s.name}</span>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6 shrink-0'
                onClick={(e) => {
                  e.stopPropagation()
                  if (s.id && confirm(t('Delete this supplier?')))
                    deleteMut.mutate(s.id)
                }}
              >
                <Trash2 className='h-3.5 w-3.5 text-destructive' />
              </Button>
            </div>
          ))}
          {suppliers.length === 0 && (
            <p className='text-muted-foreground px-3 py-6 text-center text-xs'>
              {t('No suppliers yet')}
            </p>
          )}
        </div>
      </ScrollArea>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Create Supplier')}</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('Supplier name')}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <DialogFooter>
            <Button onClick={create} disabled={!newName.trim()}>
              {t('Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Supplier Detail Card (right panel top)
// ---------------------------------------------------------------------------

function SupplierDetailCard({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(supplier)
  const upsert = useUpsertSupplier()

  const save = () => {
    upsert.mutate(form, { onSettled: () => setEditing(false) })
  }

  const fields: { key: keyof Supplier; label: string; type?: string }[] = [
    { key: 'name', label: t('Name') },
    { key: 'display_currency', label: t('Display Currency') },
    { key: 'settlement_currency', label: t('Settlement Currency') },
    {
      key: 'quote_unit_to_cny_rate',
      label: t('Quote Unit to CNY Rate'),
      type: 'number',
    },
    {
      key: 'official_usd_to_cny_rate',
      label: t('USD to CNY Rate'),
      type: 'number',
    },
  ]

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-base'>{supplier.name}</CardTitle>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => {
            if (editing) save()
            else {
              setForm(supplier)
              setEditing(true)
            }
          }}
        >
          {editing ? t('Save') : <Pencil className='h-4 w-4' />}
        </Button>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
          {fields.map((f) => (
            <div key={f.key} className='space-y-1'>
              <Label className='text-muted-foreground text-xs'>
                {f.label}
              </Label>
              {editing ? (
                <Input
                  value={String(form[f.key] ?? '')}
                  type={f.type ?? 'text'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [f.key]:
                        f.type === 'number'
                          ? Number(e.target.value)
                          : e.target.value,
                    })
                  }
                />
              ) : (
                <p className='text-sm font-medium'>
                  {String(supplier[f.key] ?? '-')}
                </p>
              )}
            </div>
          ))}
        </div>
        {supplier.remark && (
          <p className='text-muted-foreground mt-2 text-xs'>
            {supplier.remark}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Model Price Table (per channel, collapsible)
// ---------------------------------------------------------------------------

function ModelPriceTable({
  channelId,
  channelName,
  onDelete,
}: {
  channelId: number
  channelName: string
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const { data: pricesData } = useSupplierChannelPrices(channelId)
  const updatePrices = useUpdateSupplierChannelPrices(channelId)
  const parseLog = useParseSupplierLog(channelId)
  const [logText, setLogText] = useState('')

  const prices = useMemo<SupplierModelCost[]>(
    () => pricesData?.data ?? [],
    [pricesData]
  )

  const parseAndAppend = async () => {
    const result = await parseLog.mutateAsync(logText)
    const parsed = result.data
    if (!parsed) return

    const existing: SupplierModelPrice[] = prices.map((p) => ({
      id: p.id,
      supplier_channel_id: p.supplier_channel_id,
      model_name: p.model_name,
      base_input_price: p.base_input_price,
      base_output_price: p.base_output_price,
      base_cache_read_price: p.base_cache_read_price,
      base_cache_write_price: p.base_cache_write_price,
      official_input_price_usd: p.official_input_price_usd,
      official_output_price_usd: p.official_output_price_usd,
      official_cache_read_price_usd: p.official_cache_read_price_usd,
      official_cache_write_price_usd: p.official_cache_write_price_usd,
      model_ratio: p.model_ratio,
      use_fixed_price: p.use_fixed_price,
      remark: p.remark,
    }))

    updatePrices.mutate([
      ...existing,
      {
        supplier_channel_id: channelId,
        model_name: parsed.model_name ?? '',
        base_input_price: parsed.input_price ?? 0,
        base_output_price: parsed.output_price ?? 0,
        base_cache_read_price: parsed.cache_read_price ?? 0,
        base_cache_write_price: parsed.cache_write_price ?? 0,
        official_input_price_usd: 0,
        official_output_price_usd: 0,
        official_cache_read_price_usd: 0,
        official_cache_write_price_usd: 0,
        model_ratio: 0,
        use_fixed_price: false,
      },
    ])
    setLogText('')
  }

  return (
    <Card>
      <div
        className='flex cursor-pointer items-center justify-between px-4 py-3'
        onClick={() => setExpanded(!expanded)}
      >
        <div className='flex items-center gap-2'>
          {expanded ? (
            <ChevronDown className='h-4 w-4' />
          ) : (
            <ChevronRight className='h-4 w-4' />
          )}
          <span className='text-sm font-medium'>{channelName}</span>
          <span className='text-muted-foreground text-xs'>
            ({prices.length} {t('models')})
          </span>
        </div>
        {onDelete && (
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6 shrink-0'
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(t('Remove this channel?'))) onDelete()
            }}
          >
            <Trash2 className='h-3.5 w-3.5 text-destructive' />
          </Button>
        )}
      </div>

      {expanded && (
        <CardContent className='pt-0'>
          <Separator className='mb-3' />
          <div className='space-y-3'>
            <div className='flex gap-2'>
              <Textarea
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder={t('Paste supplier billing log')}
                className='min-h-[60px]'
              />
              <Button
                onClick={parseAndAppend}
                disabled={!logText.trim()}
                size='sm'
                className='shrink-0 self-end'
              >
                {t('Parse log')}
              </Button>
            </div>

            {prices.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Model')}</TableHead>
                    <TableHead className='text-right'>
                      {t('Input CNY')}
                    </TableHead>
                    <TableHead className='text-right'>
                      {t('Output CNY')}
                    </TableHead>
                    <TableHead className='text-right'>
                      {t('Cache R CNY')}
                    </TableHead>
                    <TableHead className='text-right'>
                      {t('Cache W CNY')}
                    </TableHead>
                    <TableHead className='text-right'>
                      {t('Input Ratio')}
                    </TableHead>
                    <TableHead className='text-right'>
                      {t('Output Ratio')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prices.map((p) => (
                    <TableRow key={p.model_name}>
                      <TableCell className='font-mono text-xs'>
                        {p.model_name}
                      </TableCell>
                      <TableCell className='text-right'>
                        {p.effective_input_cny?.toFixed(6) ?? '-'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {p.effective_output_cny?.toFixed(6) ?? '-'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {p.effective_cache_read_cny?.toFixed(6) ?? '-'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {p.effective_cache_write_cny?.toFixed(6) ?? '-'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {p.input_cost_ratio?.toFixed(2) ?? '-'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {p.output_cost_ratio?.toFixed(2) ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Channel Associations (right panel middle)
// ---------------------------------------------------------------------------

function ChannelAssociations({ supplierId }: { supplierId: number }) {
  const { t } = useTranslation()
  const { data: channelsData } = useSupplierChannels(supplierId)
  const createChannel = useCreateSupplierChannel(supplierId)
  const deleteChannel = useDeleteSupplierChannel(supplierId)
  const [addOpen, setAddOpen] = useState(false)
  const [channelId, setChannelId] = useState('')
  const [ratio, setRatio] = useState('1')

  const channels: SupplierChannel[] = channelsData?.data ?? []

  const add = () => {
    const cid = Number(channelId)
    if (!cid) return
    createChannel.mutate(
      {
        supplier_id: supplierId,
        channel_id: cid,
        ratio: Number(ratio) || 1,
      },
      { onSuccess: () => {
        setChannelId('')
        setRatio('1')
        setAddOpen(false)
      }}
    )
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-medium'>{t('Channel Associations')}</h3>
        <Button variant='outline' size='sm' onClick={() => setAddOpen(true)}>
          <Plus className='mr-1 h-4 w-4' />
          {t('Add Channel')}
        </Button>
      </div>

      {channels.length === 0 ? (
        <p className='text-muted-foreground py-4 text-center text-xs'>
          {t('No channels associated yet')}
        </p>
      ) : (
        <div className='space-y-2'>
          {channels.map((ch) => (
            <ModelPriceTable
              key={ch.id}
              channelId={ch.id}
              channelName={`Channel #${ch.channel_id}`}
              onDelete={() => ch.id && deleteChannel.mutate(ch.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Add Channel')}</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='space-y-1'>
              <Label>{t('Channel ID')}</Label>
              <Input
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                type='number'
                placeholder={t('Enter channel ID')}
              />
            </div>
            <div className='space-y-1'>
              <Label>{t('Ratio')}</Label>
              <Input
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                type='number'
                step='0.01'
                placeholder='1.0'
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={add} disabled={!channelId}>
              {t('Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function SupplierManagementPage() {
  const { t } = useTranslation()
  const { data: suppliersData, isLoading } = useSuppliers()
  const suppliers: Supplier[] = suppliersData?.data ?? []
  const [selectedId, setSelectedId] = useState(0)

  const currentSupplier = suppliers.find((s) => s.id === selectedId)

  if (isLoading) {
    return <div className='p-6'>{t('Loading...')}</div>
  }

  return (
    <div className='flex h-full gap-6 p-6'>
      {/* Left panel - supplier list */}
      <div className='w-64 shrink-0'>
        <SupplierList
          suppliers={suppliers}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Right panel - detail + channels */}
      <div className='min-w-0 flex-1 space-y-4'>
        {!currentSupplier ? (
          <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
            {t('Select a supplier to get started')}
          </div>
        ) : (
          <>
            <SupplierDetailCard supplier={currentSupplier} />
            <ChannelAssociations supplierId={currentSupplier.id!} />
          </>
        )}
      </div>
    </div>
  )
}
