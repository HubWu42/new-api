import { useTranslation } from 'react-i18next'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useProfitDashboard } from '../hooks/use-profit'

function formatQuota(value: number) {
  return value.toLocaleString()
}

export function ProfitDashboardPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useProfitDashboard()
  const dashboard = data?.data

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Profit Analysis')}</SectionPageLayout.Title>
      <SectionPageLayout.Description>
        {t('Track revenue, cost, and profit across models and channels')}
      </SectionPageLayout.Description>
      <SectionPageLayout.Content>
        {isLoading ? (
          <LoadingState />
        ) : !dashboard ? (
          <EmptyState description={t('No profit data')} />
        ) : (
          <div className='space-y-6'>
            <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
              <Card>
                <CardHeader>
                  <CardTitle>{t('Total Revenue')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {formatQuota(dashboard.total_revenue)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('Total Cost')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {formatQuota(dashboard.total_cost)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('Total Profit')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {formatQuota(dashboard.total_profit)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('Profit Rate')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard.profit_rate.toFixed(2)}%
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('Top Profit Models')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Model')}</TableHead>
                      <TableHead>{t('Revenue')}</TableHead>
                      <TableHead>{t('Cost')}</TableHead>
                      <TableHead>{t('Profit')}</TableHead>
                      <TableHead>{t('Rate')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.top_profit_models.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell>{row.key}</TableCell>
                        <TableCell>{formatQuota(row.revenue)}</TableCell>
                        <TableCell>{formatQuota(row.cost)}</TableCell>
                        <TableCell>{formatQuota(row.profit)}</TableCell>
                        <TableCell>{row.profit_rate.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {dashboard.top_cost_channels &&
              dashboard.top_cost_channels.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('Top Cost Channels')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('Channel')}</TableHead>
                          <TableHead>{t('Revenue')}</TableHead>
                          <TableHead>{t('Cost')}</TableHead>
                          <TableHead>{t('Profit')}</TableHead>
                          <TableHead>{t('Rate')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard.top_cost_channels.map((row) => (
                          <TableRow key={row.key}>
                            <TableCell>{row.key}</TableCell>
                            <TableCell>{formatQuota(row.revenue)}</TableCell>
                            <TableCell>{formatQuota(row.cost)}</TableCell>
                            <TableCell>{formatQuota(row.profit)}</TableCell>
                            <TableCell>{row.profit_rate.toFixed(2)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

            {dashboard.daily_trend &&
              dashboard.daily_trend.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('Daily Trend')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('Date')}</TableHead>
                          <TableHead>{t('Revenue')}</TableHead>
                          <TableHead>{t('Cost')}</TableHead>
                          <TableHead>{t('Profit')}</TableHead>
                          <TableHead>{t('Rate')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard.daily_trend.map((row) => (
                          <TableRow key={row.key}>
                            <TableCell>{row.key}</TableCell>
                            <TableCell>{formatQuota(row.revenue)}</TableCell>
                            <TableCell>{formatQuota(row.cost)}</TableCell>
                            <TableCell>{formatQuota(row.profit)}</TableCell>
                            <TableCell>
                              {row.profit_rate.toFixed(2)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
          </div>
        )}
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
