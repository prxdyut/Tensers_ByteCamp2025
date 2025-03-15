import { useState, useEffect } from 'react';
import { ApexOptions } from 'apexcharts';

interface SubscriberBarChartProps {
  className?: string;
}

const SubscriberBarChart = ({ className = '' }: SubscriberBarChartProps) => {
  const [Chart, setChart] = useState<any>(null);

  useEffect(() => {
    import('react-apexcharts').then((mod) => {
      setChart(() => mod.default);
    });
  }, []);

  const [chartData] = useState({
    series: [{
      name: 'Monthly Subscribers',
      data: [320, 350, 400, 380, 450, 420, 480, 460, 500, 530, 550, 580]
    }],
    options: {
      chart: {
        type: 'bar',
        height: 200,
        toolbar: {
          show: false
        },
        background: 'transparent',
        foreColor: '#9ca3af'
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '55%',
          distributed: false,
          endingShape: 'rounded'
        },
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        width: 0
      },
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        },
        labels: {
          style: {
            colors: '#9ca3af'
          }
        }
      },
      yaxis: {
        labels: {
          formatter: (value: number) => Math.round(value).toString(),
          style: {
            colors: '#9ca3af'
          }
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
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            height: 200
          }
        }
      }]
    } as ApexOptions
  });

  return (
    <div className={`card h-full rounded-lg border-0 ${className}`}>
      <div className="card-body p-6">
        <h6 className="mb-3 font-semibold text-lg">Total Subscribers</h6>
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

export default SubscriberBarChart; 