import React, { useState, useEffect, useMemo } from 'react';
import { useTable } from 'react-table';
import { format, isValid, parse } from 'date-fns';
import { exportAssignmentsToCSV } from '../utils/csvExport';

/**
 * A component that renders an editable table for assignment data
 * @param {Object} props - Component props
 * @param {Array} props.data - Initial data array of assignment objects
 * @param {Function} props.onDataChange - Callback function when data changes
 */
const EditableTable = ({ data, onDataChange }) => {
  const [tableData, setTableData] = useState([]);
  
  // Initialize table data when the data prop changes
  useEffect(() => {
    if (data && (Array.isArray(data) || Array.isArray(data.items))) {
      const formattedData = Array.isArray(data) ? data : data.items || [];
      setTableData(formattedData.map(item => ({
        ...item,
        id: item.id || crypto.randomUUID() // Ensure each row has a unique id
      })));
    }
  }, [data]);

  // Update parent component when tableData changes
  useEffect(() => {
    if (onDataChange && tableData.length > 0) {
      onDataChange(tableData);
    }
  }, [tableData, onDataChange]);

  // Define columns for react-table
  const columns = useMemo(
    () => [
      {
        Header: 'Title',
        accessor: 'title',
        Cell: ({ row, value, updateData }) => {
          return (
            <input
              className="w-full p-1 border border-gray-200 rounded focus:border-blue-400 focus:outline-none"
              value={value || ''}
              onChange={e => updateData(row.index, 'title', e.target.value)}
            />
          );
        }
      },
      {
        Header: 'Type',
        accessor: 'type',
        Cell: ({ row, value, updateData }) => {
          return (
            <select
              className="w-full p-1 border border-gray-200 rounded focus:border-blue-400 focus:outline-none"
              value={value || 'assignment'}
              onChange={e => updateData(row.index, 'type', e.target.value)}
            >
              <option value="assignment">Assignment</option>
              <option value="quiz">Quiz</option>
              <option value="exam">Exam</option>
              <option value="paper">Paper</option>
              <option value="project">Project</option>
            </select>
          );
        }
      },
      {
        Header: 'Due Date',
        accessor: 'due_date',
        Cell: ({ row, value, updateData }) => {
          return (
            <input
              className="w-full p-1 border border-gray-200 rounded focus:border-blue-400 focus:outline-none"
              type="date"
              value={value || ''}
              onChange={e => updateData(row.index, 'due_date', e.target.value)}
            />
          );
        }
      },
      {
        Header: 'Start Date',
        accessor: 'start_date',
        Cell: ({ row, value, updateData }) => {
          const showStartDate = ['paper', 'project'].includes(row.values.type);
          
          if (!showStartDate) return null;
          
          return (
            <input
              className="w-full p-1 border border-gray-200 rounded focus:border-blue-400 focus:outline-none"
              type="date"
              value={value || ''}
              onChange={e => updateData(row.index, 'start_date', e.target.value)}
            />
          );
        }
      },
      {
        Header: 'Description',
        accessor: 'description',
        Cell: ({ row, value, updateData }) => {
          return (
            <textarea
              className="w-full p-1 border border-gray-200 rounded focus:border-blue-400 focus:outline-none"
              value={value || ''}
              rows="2"
              onChange={e => updateData(row.index, 'description', e.target.value)}
            />
          );
        }
      },
      {
        Header: 'Actions',
        id: 'actions',
        Cell: ({ row, deleteRow }) => {
          return (
            <button
              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={() => deleteRow(row.index)}
            >
              Delete
            </button>
          );
        }
      }
    ],
    []
  );

  // Function to update data in the table
  const updateData = (rowIndex, columnId, value) => {
    setTableData(old => 
      old.map((row, index) => {
        if (index === rowIndex) {
          return {
            ...old[rowIndex],
            [columnId]: value,
          };
        }
        return row;
      })
    );
  };

  // Function to add a new row
  const addRow = () => {
    const newRow = {
      id: crypto.randomUUID(),
      title: 'New Assignment',
      type: 'assignment',
      due_date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
    };
    
    setTableData(old => [...old, newRow]);
  };

  // Function to delete a row
  const deleteRow = (rowIndex) => {
    setTableData(old => old.filter((_, index) => index !== rowIndex));
  };

  // Download table data as CSV
  const downloadCSV = () => {
    exportAssignmentsToCSV(tableData, 'assignments.csv');
  };

  // Setup react-table instance
  const tableInstance = useTable({ columns, data: tableData });
  
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = tableInstance;

  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-lg">
      <div className="flex justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Assignments</h2>
        <div className="space-x-2">
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={addRow}
          >
            Add Row
          </button>
          <button
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={downloadCSV}
          >
            Download CSV
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th
                    {...column.getHeaderProps()}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.render('Header')}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()} className="bg-white divide-y divide-gray-200">
            {rows.map(row => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()}>
                  {row.cells.map(cell => {
                    return (
                      <td
                        {...cell.getCellProps()}
                        className="px-6 py-4 whitespace-nowrap"
                      >
                        {cell.render('Cell', { 
                          updateData, 
                          deleteRow 
                        })}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {tableData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No assignments available. Click "Add Row" to create a new assignment.
        </div>
      )}
    </div>
  );
};

export default EditableTable;