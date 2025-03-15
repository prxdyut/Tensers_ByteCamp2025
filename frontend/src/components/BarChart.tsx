import { useState, useEffect } from 'react';
import { ApexOptions } from 'apexcharts';

interface BarChartProps {
  className?: string;
}

const BarChart = ({ className = '' }: BarChartProps) => {
  const [Chart, setChart] = useState<any>(null);

  useEffect(() => {
    import('react-apexcharts').then((mod) => {
      setChart(() => mod.default);
    });
  }, []);

  const [chartData] = useState({
    series: [{
      name: 'Subscribers',
      data: [44, 55, 57, 56, 61, 58, 63, 60, 66, 70, 75, 80]
    }],
    options: {
      chart: {
        type: 'bar',
        height: 200,
        toolbar: {
          show: false
        },
        foreColor: '#9ca3af'
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded'
        },
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        labels: {
          formatter: (value: number) => Math.round(value).toString()
        }
      },
      fill: {
        opacity: 1,
        colors: ['#3b82f6']
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (value: number) => `${value} subscribers`
        }
      },
      grid: {
        borderColor: '#374151',
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: false
          }
        }
      }
    } as ApexOptions
  });

  return (
    <div className={`card h-full rounded-lg border-0 ${className}`}>
      <div className="card-body p-6">
        <h6 className="mb-3 font-semibold text-lg">Total Subscriber</h6>
        <div className="flex items-center gap-2 mb-5">
          <h6 className="font-semibold mb-0">5,000</h6>
          <span className="text-sm font-semibold rounded-full bg-danger-100 dark:bg-danger-600/25 text-danger-600 dark:text-danger-400 border border-danger-200 dark:border-danger-600/50 px-2 py-1.5 line-height-1 flex items-center gap-1">
            10% <span className="text-xs">↓</span>
          </span>
          <span className="text-sm text-neutral-600 dark:text-neutral-400">- 20 Per Day</span>
        </div>
        <div className="h-[200px]">
          {Chart && (
            <Chart
              options={chartData.options}
              series={chartData.series}
              type="bar"
              height="100%"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BarChart; 