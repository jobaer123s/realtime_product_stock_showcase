from odoo import models, api, fields
from datetime import datetime, timedelta

class StockPicking(models.Model):
    _inherit = 'stock.picking'

    def button_validate(self):
        res = super().button_validate()
        # tell the client list to refresh (your JS already listens on this)
        self.env['bus.bus']._sendone(
            self.env.user.partner_id, 'stock.quant.sync', {'refresh': True}
        )
        return res


class StockQuant(models.Model):
    _inherit = 'stock.quant'

    stock_status = fields.Selection(
        [('danger','Critical'),('warning','Warning'),('success','Healthy')],
        compute='_compute_stock_health', store=True, compute_sudo=True)
    last_updated = fields.Datetime(compute='_compute_stock_health', store=True, compute_sudo=True)
    stock_history_json = fields.Json(compute='_compute_stock_health', store=True, compute_sudo=True)
    stock_activity_info = fields.Char(compute='_compute_stock_health', store=True, compute_sudo=True)

    @api.depends('quantity','reserved_quantity','product_id','location_id')
    def _compute_stock_health(self):
        MoveLine = self.env['stock.move.line']
        now = fields.Datetime.now()
        for q in self:
            if not q.product_id or not q.location_id:
                q.stock_status = False
                q.stock_activity_info = False
                q.last_updated = now
                q.stock_history_json = {'purchase_trend':[0]*7,'sale_trend':[0]*7,'days':[]}
                continue

            today = fields.Date.context_today(self)
            purchase_trend, sale_trend, days = [], [], []
            for d in range(7,0,-1):
                date = today - timedelta(days=d)
                start_dt = datetime.combine(date, datetime.min.time())
                end_dt = datetime.combine(date, datetime.max.time())
                incoming = MoveLine.search([
                    ('product_id','=',q.product_id.id),
                    ('location_dest_id','=',q.location_id.id),
                    ('state','=','done'),
                    ('date','>=',fields.Datetime.to_string(start_dt)),
                    ('date','<=',fields.Datetime.to_string(end_dt)),
                ])
                outgoing = MoveLine.search([
                    ('product_id','=',q.product_id.id),
                    ('location_id','=',q.location_id.id),
                    ('state','=','done'),
                    ('date','>=',start_dt),
                    ('date','<=',end_dt),
                ])
                purchase_trend.append(float(sum(incoming.mapped('quantity')) or 0.0))
                sale_trend.append(float(sum(outgoing.mapped('quantity')) or 0.0))
                days.append(fields.Date.to_string(date))

            last_in_move = MoveLine.search([
                ('product_id','=',q.product_id.id),
                ('location_dest_id','=',q.location_id.id),
                ('state','=','done'),
            ], order='date desc', limit=1)
            last_in_qty = float(last_in_move.quantity) if last_in_move else 0.0

            last_out_move = MoveLine.search([
                ('product_id','=',q.product_id.id),
                ('location_id','=',q.location_id.id),
                ('state','=','done'),
            ], order='date desc', limit=1)
            last_out_qty = float(last_out_move.quantity) if last_out_move else 0.0

            total_out = sum(sale_trend)
            avg_out = round(total_out / 7.0, 2) if total_out else 0.0

            q.stock_activity_info = f"Last IN: {last_in_qty} | Last OUT: {last_out_qty} | Avg OUT: {avg_out}/day"
            available = float(q.quantity) - float(q.reserved_quantity or 0.0)
            print('available', available)
            if available <= 0:
                status = 'danger'
            elif avg_out <= 0:
                status = 'success'
            else:
                cover_days = available / avg_out
                status = 'danger' if cover_days < 5 else 'warning' if cover_days < 10 else 'success'
            print('days', days)
            q.stock_status = status
            q.last_updated = now
            q.stock_history_json = {'purchase_trend': purchase_trend, 'sale_trend': sale_trend, 'days': days}

