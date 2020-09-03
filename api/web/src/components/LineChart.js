import { Line, mixins } from 'vue-chartjs'
const { reactiveProp } = mixins

export default {
    extends: Line,
    mixins: [reactiveProp],
    props: ['options'],
    mounted () {
        console.error(typeof this.options);
        const opts = Object.assign({
            responsive: true
        }, JSON.parse(this.options));

        console.error(opts);
        this.renderChart(this.chartData, opts)
    }
}
