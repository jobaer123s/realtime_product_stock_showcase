from odoo import models, api, fields
from datetime import datetime, timedelta

class StockPicking(models.Model):
    _inherit = 'stock.picking'

    def button_validate(self):
        res = super().button_validate()
        print(f"User: {self.env.user}")
        self.env['bus.bus']._sendone(
            self.env.user.partner_id, 'stock.quant.sync', {'refresh': True}
        )
        return res

class StockQuant(models.Model):
    _inherit = 'stock.quant'

    stock_status = fields.Selection([
        ('danger', 'Critical'),
        ('warning', 'Warning'),
        ('success', 'Healthy'),
    ])

    last_updated = fields.Datetime(string="Last Updated", default=lambda self: fields.Datetime.now())
    stock_history_json = fields.Json(
        string="Stock History",
        # compute="_compute_stock_history_json",
        store=True,
        compute_sudo=True,
        depends_context=('company_id',)
    )

    stock_activity_info = fields.Char(
        string="Stock Activity",
        compute="_compute_inventory_quantity_auto_apply",
        store=True
    )

    @api.depends('quantity', 'product_id', 'location_id')
    def _compute_inventory_quantity_auto_apply(self):
        super()._compute_inventory_quantity_auto_apply()
        StockMoveLine = self.env['stock.move.line']

        for quant in self:
            purchase_trend = []
            sale_trend = []
            today = fields.Date.context_today(self)

            # Collect 7 days data for avg calc
            for days_ago in range(7, 0, -1):
                date = today - timedelta(days=days_ago)
                start_dt = datetime.combine(date, datetime.min.time())
                end_dt = datetime.combine(date, datetime.max.time())

                incoming_moves = StockMoveLine.search([
                    ('product_id', '=', quant.product_id.id),
                    ('location_dest_id', '=', quant.location_id.id),
                    ('date', '>=', fields.Datetime.to_string(start_dt)),
                    ('date', '<=', fields.Datetime.to_string(end_dt)),
                ])
                in_qty = sum(incoming_moves.mapped('quantity')) or 0.0
                purchase_trend.append(float(in_qty))

                outgoing_moves = StockMoveLine.search([
                    ('product_id', '=', quant.product_id.id),
                    ('location_id', '=', quant.location_id.id),
                    ('date', '>=', fields.Datetime.to_string(start_dt)),
                    ('date', '<=', fields.Datetime.to_string(end_dt)),
                ])
                out_qty = sum(outgoing_moves.mapped('quantity')) or 0.0
                sale_trend.append(float(out_qty))

            # Last IN
            last_in_move = StockMoveLine.search([
                ('product_id', '=', quant.product_id.id),
                ('location_dest_id', '=', quant.location_id.id),
            ], order='date desc', limit=1)
            last_in_qty = last_in_move.quantity if last_in_move else 0.0

            # Last OUT
            last_out_move = StockMoveLine.search([
                ('product_id', '=', quant.product_id.id),
                ('location_id', '=', quant.location_id.id),
            ], order='date desc', limit=1)
            last_out_qty = last_out_move.quantity if last_out_move else 0.0
            # Avg OUT (7 days)
            avg_out = round(sum(sale_trend) / 7.0, 2) if sum(sale_trend) else 0.0
            quant.stock_activity_info = (
                f"Last IN: {last_in_qty} | "
                f"Last OUT: {last_out_qty} | "
                f"Avg OUT: {avg_out}/day "
            )

    # @api.depends('quantity', 'product_id', 'location_id')
    # def _compute_inventory_quantity_auto_apply(self):
    #     super()._compute_inventory_quantity_auto_apply()
    #     StockMoveLine = self.env['stock.move.line']
    #     today = fields.Date.context_today(self)
    #
    #     for quant in self:
    #         purchase_trend = []
    #         sale_trend = []
    #
    #         for days_ago in range(7, 0, -1):
    #             date = today - timedelta(days=days_ago)
    #             start_dt = datetime.combine(date, datetime.min.time())
    #             end_dt = datetime.combine(date, datetime.max.time())
    #
    #             # Purchases → destination is quant.location_id
    #             incoming_moves = StockMoveLine.search([
    #                 ('product_id', '=', quant.product_id.id),
    #                 ('location_dest_id', '=', quant.location_id.id),
    #                 ('date', '>=', fields.Datetime.to_string(start_dt)),
    #                 ('date', '<=', fields.Datetime.to_string(end_dt)),
    #             ])
    #             in_qty = sum(incoming_moves.mapped('quantity')) or 0.0
    #             purchase_trend.append(float(in_qty))
    #
    #             # Sales → source is quant.location_id
    #             outgoing_moves = StockMoveLine.search([
    #                 ('product_id', '=', quant.product_id.id),
    #                 ('location_id', '=', quant.location_id.id),
    #                 ('date', '>=', fields.Datetime.to_string(start_dt)),
    #                 ('date', '<=', fields.Datetime.to_string(end_dt)),
    #             ])
    #             out_qty = sum(outgoing_moves.mapped('quantity')) or 0.0
    #             sale_trend.append(float(out_qty))
    #
    #         quant.stock_history_json = {
    #             'purchase_trend': purchase_trend,
    #             'sale_trend': sale_trend,
    #         }


    def write(self, vals):
        if 'quantity' in vals or 'inventory_quantity' in vals:
            vals['last_updated'] = fields.Datetime.now()
        return super().write(vals)