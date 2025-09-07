/** @odoo-module */

import { Component, onMounted, useRef, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { standardFieldProps } from "@web/views/fields/standard_field_props";
import { useService } from "@web/core/utils/hooks";
import { Dialog } from "@web/core/dialog/dialog";

/* Big chart in a dialog */
class TrendBigChart extends Component {
    static template = "realtime_product_stock_showcase.TrendBigChart";
    static components = { Dialog };
    // accept optional totals if you want to show KPIs in template
    static props = {
        value: { type: Object, optional: false },
        totals: { type: Object, optional: true },
    };

    setup() {
        this.containerRef = useRef("bigChart");
        this.state = useState({ title: "Big Chart (Last 7days)" });
        onMounted(() => this.renderBigChart());
    }

    // handy if you choose to use KPIs in template later
    sum(arr) {
        let t = 0;
        for (const n of (arr || [])) t += Number(n) || 0;
        return t;
    }

    renderBigChart() {
        const el = this.containerRef.el;
        if (!el) return;
        el.innerHTML = "";

        const value = this.props.value || {};
        let inArr  = Array.isArray(value.purchase_trend) ? value.purchase_trend.slice(0, 7) : [];
        let outArr = Array.isArray(value.sale_trend)     ? value.sale_trend.slice(0, 7)     : [];
        let days   = Array.isArray(value.days)           ? value.days.slice(0, 7)           : [];
        while (inArr.length  < 7) inArr.unshift(0);
        while (outArr.length < 7) outArr.unshift(0);
        while (days.length   < 7) days.unshift("");
        console.log('inArr', inArr, 'outArr', outArr, 'days', days);
        // layout
        const max = Math.max(1, ...inArr, ...outArr);
        const H = 160;
        const W_PER_DAY = 50;
        const BAR_W = 8;
        const GAP = 8;
        const width = 450;

        const leftPad  = 56;         // ⬅️ extra space for y-labels
        const rightPad = 12;
        const topPad   = 20;
        const baselineY = H - 32;
        const chartWidth  = width - leftPad - rightPad;
        const chartHeight = baselineY - topPad;

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", width);
        svg.setAttribute("height", H);
        svg.style.display = "block";
        svg.style.background = "#fff";

        // grid + y ticks
        const ticks = 4;
        for (let t = 1; t <= ticks; t++) {
            const y = baselineY - Math.round((chartHeight * t) / (ticks + 1));
            const grid = document.createElementNS(svgNS, "line");
            grid.setAttribute("x1", leftPad);
            grid.setAttribute("x2", leftPad + chartWidth);
            grid.setAttribute("y1", y);
            grid.setAttribute("y2", y);
            grid.setAttribute("stroke", "#f3f4f6");
            svg.appendChild(grid);

            const lbl = document.createElementNS(svgNS, "text");
            const val = Math.round((max * t) / (ticks + 1));
            lbl.setAttribute("x", leftPad - 10);
            lbl.setAttribute("y", y + 3);
            lbl.setAttribute("text-anchor", "end");   // ⬅️ align right
            lbl.setAttribute("font-size", "10");
            lbl.setAttribute("fill", "#9ca3af");
            lbl.textContent = String(val);
            svg.appendChild(lbl);
        }

        // baseline
        const axis = document.createElementNS(svgNS, "line");
        axis.setAttribute("x1", leftPad);
        axis.setAttribute("y1", baselineY);
        axis.setAttribute("x2", leftPad + chartWidth);
        axis.setAttribute("y2", baselineY);
        axis.setAttribute("stroke", "#e5e7eb");
        svg.appendChild(axis);

        // bars
        for (let i = 0; i < 7; i++) {
            const gx = leftPad + i * W_PER_DAY + (W_PER_DAY - (BAR_W * 2 + GAP)) / 2;
            const inH  = Math.round((inArr[i]  / max) * chartHeight);
            const outH = Math.round((outArr[i] / max) * chartHeight);

            // OUT (red)
            const rOut = document.createElementNS(svgNS, "rect");
            rOut.setAttribute("x", gx);
            rOut.setAttribute("y", baselineY - outH);
            rOut.setAttribute("width", BAR_W);
            rOut.setAttribute("height", outH);
            rOut.setAttribute("fill", "#EF4444");
            svg.appendChild(rOut);

            // IN (blue)
            const rIn = document.createElementNS(svgNS, "rect");
            rIn.setAttribute("x", gx + BAR_W + GAP);
            rIn.setAttribute("y", baselineY - inH);
            rIn.setAttribute("width", BAR_W);
            rIn.setAttribute("height", inH);
            rIn.setAttribute("fill", "#3B82F6");
            svg.appendChild(rIn);

            // value labels (only if tall enough)
            if (outH > 0) {
                const tOut = document.createElementNS(svgNS, "text");
                tOut.setAttribute("x", gx + BAR_W / 2);
                tOut.setAttribute("y", baselineY - outH - 4);
                tOut.setAttribute("text-anchor", "middle");
                tOut.setAttribute("font-size", "10");
                tOut.setAttribute("fill", "#374151");
                tOut.textContent = String(outArr[i]);
                svg.appendChild(tOut);
            }
            if (inH > 0) {
                const tIn = document.createElementNS(svgNS, "text");
                tIn.setAttribute("x", gx + BAR_W + GAP + BAR_W / 2);
                tIn.setAttribute("y", baselineY - inH - 4);
                tIn.setAttribute("text-anchor", "middle");
                tIn.setAttribute("font-size", "10");
                tIn.setAttribute("fill", "#374151");
                tIn.textContent = String(inArr[i]);
                svg.appendChild(tIn);
            }

            // day label
            const label = document.createElementNS(svgNS, "text");
            label.setAttribute("x", gx + BAR_W + GAP / 2);
            label.setAttribute("y", H - 10);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("font-size", "11");
            label.setAttribute("fill", "#6b7280");
            label.textContent = days[i] ? days[i].slice(5) : `D${i + 1}`;
            svg.appendChild(label);
        }

        // legend (moved higher & further left)
        const legend = document.createElementNS(svgNS, "g");
        const legendX = leftPad + 4;
        const legendY = Math.max(8, topPad - 10);  // ⬅️ push up
        const addLg = (dx, text, color) => {
            const rr = document.createElementNS(svgNS, "rect");
            rr.setAttribute("x", legendX + dx);
            rr.setAttribute("y", legendY);
            rr.setAttribute("width", 10);
            rr.setAttribute("height", 10);
            rr.setAttribute("fill", color);
            legend.appendChild(rr);

            const tt = document.createElementNS(svgNS, "text");
            tt.setAttribute("x", legendX + dx + 14);
            tt.setAttribute("y", legendY + 9);
            tt.setAttribute("font-size", "12");
            tt.setAttribute("fill", "#374151");
            tt.textContent = text;
            legend.appendChild(tt);
        };
        addLg(0, "Out", "#EF4444");
        addLg(44, "In",  "#3B82F6");
        svg.appendChild(legend);

        el.appendChild(svg);
    }
}

/* Mini chart inside list cell */
class TrendMiniChart extends Component {
    static template = "realtime_product_stock_showcase.TrendMiniChart";
    static props = { ...standardFieldProps };

    setup() {
        this.chartRef = useRef("chart");
        this.dialog = useService("dialog");
        onMounted(() => this.drawMini());
    }

    openDialog() {
        // always use the field value for Owl widgets
        const v = this.props.record._values.stock_history_json || {};
        const sum = (a) => (a || []).reduce((s, n) => s + (Number(n) || 0), 0);
        const totals = { in: sum(v.purchase_trend), out: sum(v.sale_trend) };
        this.dialog.add(TrendBigChart, { value: v, totals }, { title: "7-Day Trend", size: "lg" });
    }

    drawMini() {
        const el = this.chartRef.el;
        if (!el) return;
        el.innerHTML = "";

        const v = this.props.record._values.stock_history_json || {};
        let ins  = Array.isArray(v.purchase_trend) ? v.purchase_trend.slice(0, 7) : [1,2,34,4,5,6,7];
        let outs = Array.isArray(v.sale_trend)     ? v.sale_trend.slice(0, 7)     : [1,2,34,4,5,6,7];
        while (ins.length  < 7) ins.unshift(0);
        while (outs.length < 7) outs.unshift(0);

        const max = Math.max(1, ...ins, ...outs);
        const H = 24, WDAY = 12;
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", WDAY * 7);
        svg.setAttribute("height", H);
        svg.style.cursor = "pointer";

        const block = (e) => { e.stopPropagation(); e.preventDefault(); };
        svg.addEventListener("mousedown", block);
        svg.addEventListener("pointerdown", block);
        svg.addEventListener("click", (e) => { block(e); this.openDialog(); });

        for (let i = 0; i < 7; i++) {
            const x0 = i * WDAY;
            const inH  = Math.round((ins[i]  / max) * (H - 2));
            const outH = Math.round((outs[i] / max) * (H - 2));

            const rOut = document.createElementNS(svgNS, "rect");
            rOut.setAttribute("x", x0 + 0);
            rOut.setAttribute("y", H - outH);
            rOut.setAttribute("width", 3);
            rOut.setAttribute("height", outH);
            rOut.setAttribute("fill", "#EF4444");
            svg.appendChild(rOut);

            const rIn = document.createElementNS(svgNS, "rect");
            rIn.setAttribute("x", x0 + 5);
            rIn.setAttribute("y", H - inH);
            rIn.setAttribute("width", 3);
            rIn.setAttribute("height", inH);
            rIn.setAttribute("fill", "#3B82F6");
            svg.appendChild(rIn);
        }
        el.appendChild(svg);
    }
}

export const trendMiniChart = { component: TrendMiniChart };
registry.category("fields").add("stock_trend_widget", trendMiniChart);
