import React from 'react';
import { Pagination } from './Pagination';

export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs ${className}`}
    >
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-sm">{children}</table>
      </div>
    </div>
  );
};

export const TableHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <thead
    className={`bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider ${className}`}
  >
    {children}
  </thead>
);

export const TableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <tbody className={`divide-y divide-slate-100 ${className}`}>{children}</tbody>;

export const TableRow: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => (
  <tr
    onClick={onClick}
    className={`hover:bg-slate-50/70 transition-colors duration-100 ${
      onClick ? 'cursor-pointer' : ''
    } ${className}`}
  >
    {children}
  </tr>
);

export const TableHead: React.FC<{
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}> = ({ children, className = '', align = 'left' }) => {
  const alignClass =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  return <th className={`py-3.5 px-4 font-semibold ${alignClass} ${className}`}>{children}</th>;
};

export const TableCell: React.FC<{
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}> = ({ children, className = '', align = 'left' }) => {
  const alignClass =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  return <td className={`py-3.5 px-4 align-middle ${alignClass} ${className}`}>{children}</td>;
};

export interface ColumnDef<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T, index: number) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  hideOnMobile?: boolean;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T, index: number) => string;
  renderMobileCard?: (item: T, index: number) => React.ReactNode;
  onRowClick?: (item: T) => void;
  className?: string;
  emptyState?: React.ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  renderMobileCard,
  onRowClick,
  className = '',
  emptyState,
  pagination,
}: ResponsiveTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Desktop Table View (>= md) */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <tr>
              {columns.map((col, idx) => (
                <TableHead key={idx} align={col.align} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </tr>
          </TableHeader>
          <TableBody>
            {data.map((item, rowIdx) => (
              <TableRow
                key={keyExtractor(item, rowIdx)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map((col, colIdx) => (
                  <TableCell key={colIdx} align={col.align} className={col.className}>
                    {col.cell
                      ? col.cell(item, rowIdx)
                      : col.accessorKey
                      ? (item[col.accessorKey] as React.ReactNode)
                      : null}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 2. Mobile Card View (< md) */}
      <div className="md:hidden space-y-3">
        {data.map((item, index) => {
          if (renderMobileCard) {
            return (
              <div key={keyExtractor(item, index)} onClick={onRowClick ? () => onRowClick(item) : undefined}>
                {renderMobileCard(item, index)}
              </div>
            );
          }

          // Default sleek mobile card representation
          return (
            <div
              key={keyExtractor(item, index)}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={`bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-2.5 transition active:scale-[0.99] ${
                onRowClick ? 'cursor-pointer hover:border-brand-300' : ''
              }`}
            >
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((col, colIdx) => (
                  <div
                    key={colIdx}
                    className="flex items-start justify-between gap-2 text-xs py-1 border-b border-slate-50 last:border-0"
                  >
                    <span className="text-slate-400 font-medium shrink-0">{col.header}</span>
                    <div className="text-slate-900 text-right font-medium">
                      {col.cell
                        ? col.cell(item, index)
                        : col.accessorKey
                        ? (item[col.accessorKey] as React.ReactNode)
                        : null}
                    </div>
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      {/* 3. Integrated Pagination */}
      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}

