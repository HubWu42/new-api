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
  const { data, isLoading } = useProfitDashboard()
  const dashboard = data?.data

  if (isLoading) return <div className='p-6'>Loading...</div>
  if (!dashboard) return <div className='p-6'>No profit data</div>

  return (
    <div className='space-y-6 p-6'>
      <div className='grid grid-cols-4 gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>{formatQuota(dashboard.total_revenue)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Cost</CardTitle>
          </CardHeader>
          <CardContent>{formatQuota(dashboard.total_cost)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Profit</CardTitle>
          </CardHeader>
          <CardContent>{formatQuota(dashboard.total_profit)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profit Rate</CardTitle>
          </CardHeader>
          <CardContent>{dashboard.profit_rate.toFixed(2)}%</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Top Profit Models</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Rate</TableHead>
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
      {dashboard.top_cost_channels && dashboard.top_cost_channels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Cost Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Rate</TableHead>
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
      {dashboard.daily_trend && dashboard.daily_trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.daily_trend.map((row) => (
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
    </div>
  )
}
