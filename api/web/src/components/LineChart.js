import { Line, mixins } from 'vue-chartjs'
const { reactiveProp } = mixins

export default {
    extends: Line,
    mixins: [reactiveProp],
    props: ['options'],
    mounted () {
        const opts = Object.assign({
            responsive: true
        }, JSON.parse(this.options));

        this.renderChart(this.chartData, opts)
    }
}
