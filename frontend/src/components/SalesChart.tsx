import { useState, useEffect } from 'react';
import { ApexOptions } from 'apexcharts';

interface SalesChartProps {
  className?: string;
}

const SalesChart = ({ className = '' }: SalesChartProps) => {
  const [Chart, setChart] = useState<any>(null);

  useEffect(() => {
    import('react-apexcharts').then((mod) => {
      setChart(() => mod.default);
    });
  }, []);

  const [chartData] = useState({
    series: [{
      name: 'Sales',
      data: [30, 40, 35, 50, 49, 60, 70, 91, 125, 150, 135, 160]
    }],
    options: {
      chart: {
        type: 'area',
        height: 350,
        zoom: {
          enabled: false
        },
        toolbar: {
          show: false
        },
        foreColor: '#9ca3af' // text color
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      colors: ['#3b82f6'], // primary blue color
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [50, 100]
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
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        axisBorder: {
          color: '#374151'
        },
        axisTicks: {
          color: '#374151'
        }
      },
      yaxis: {
        labels: {
          formatter: (value: number) => `$${value}k`
        }
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (value: number) => `$${value}k`
        }
      }
    } as ApexOptions
  });

  return (
    <div className={`card h-full rounded-lg border-0 ${className}`}>
      <div className="card-body">
        <div className="flex flex-wrap items-center justify-between">
          <h6 className="text-lg mb-0">Sales Statistics</h6>
          <select className="form-select bg-white dark:bg-neutral-700 form-select-sm w-auto">
            <option>Yearly</option>
            <option>Monthly</option>
            <option>Weekly</option>
            <option>Today</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <h6 className="mb-0">$27,200</h6>
          <span className="text-sm font-semibold rounded-full bg-success-100 dark:bg-success-600/25 text-success-600 dark:text-success-400 border border-success-200 dark:border-success-600/50 px-2 py-1.5 line-height-1 flex items-center gap-1">
            10% <span className="text-xs">↑</span>
          </span>
          <span className="text-xs font-medium">+ $1400 Per Day</span>
        </div>
        <div className="pt-[28px]">
          {Chart && (
            <Chart
              options={chartData.options}
              series={chartData.series}
              type="area"
              height={350}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesChart; 