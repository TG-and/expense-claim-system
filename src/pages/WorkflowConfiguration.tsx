import { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  MarkerType,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Plus, Trash2, X, ArrowRight, CheckCircle, Circle, Square, Play, StopCircle, Settings, User, FileText, DollarSign } from 'lucide-react';

interface WorkflowNodeData {
  label: string;
  nodeType: 'start' | 'approval' | 'action' | 'end' | 'condition';
  approverRole?: string;
  approverDepartment?: string;
  approverUserId?: string;
  condition?: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  entity_type: string;
  is_default: number;
  is_active: number;
  nodes: string;
  edges: string;
}

const nodeStyles: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  start: {
    bg: 'bg-green-50',
    border: 'border-green-500',
    icon: <Play className="w-4 h-4 text-green-600" />,
  },
  approval: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    icon: <User className="w-4 h-4 text-blue-600" />,
  },
  action: {
    bg: 'bg-purple-50',
    border: 'border-purple-500',
    icon: <Settings className="w-4 h-4 text-purple-600" />,
  },
  condition: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-500',
    icon: <Circle className="w-4 h-4 text-yellow-600" />,
  },
  end: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    icon: <StopCircle className="w-4 h-4 text-red-600" />,
  },
};

function CustomNode({ data, selected }: NodeProps<Node<WorkflowNodeData>>) {
  const style = nodeStyles[data.nodeType] || nodeStyles.action;
  
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-sm min-w-[160px] ${style.bg} ${style.border} ${
        selected ? 'ring-2 ring-offset-2 ring-blue-500' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <div className="flex items-center gap-2">
        {style.icon}
        <div>
          <div className="text-xs font-semibold text-slate-700">{data.label}</div>
          {data.approverRole && (
            <div className="text-[10px] text-slate-500">Approver: {data.approverRole}</div>
          )}
          {data.condition && (
            <div className="text-[10px] text-slate-500">Condition: {data.condition}</div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

const initialNodes: Node<WorkflowNodeData>[] = [
  {
    id: 'start',
    type: 'custom',
    position: { x: 50, y: 200 },
    data: { label: 'Submit', nodeType: 'start' },
  },
  {
    id: 'manager',
    type: 'custom',
    position: { x: 300, y: 200 },
    data: { label: 'Manager Approval', nodeType: 'approval', approverRole: 'Manager' },
  },
  {
    id: 'finance',
    type: 'custom',
    position: { x: 550, y: 200 },
    data: { label: 'Finance Review', nodeType: 'approval', approverRole: 'Finance Lead' },
  },
  {
    id: 'payment',
    type: 'custom',
    position: { x: 800, y: 200 },
    data: { label: 'Process Payment', nodeType: 'action' },
  },
  {
    id: 'end',
    type: 'custom',
    position: { x: 1050, y: 200 },
    data: { label: 'Complete', nodeType: 'end' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'start', target: 'manager', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2-3', source: 'manager', target: 'finance', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3-4', source: 'finance', target: 'payment', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e4-5', source: 'payment', target: 'end', markerEnd: { type: MarkerType.ArrowClosed } },
];

export default function WorkflowConfiguration() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showWorkflowList, setShowWorkflowList] = useState(true);
  const [editingWorkflow, setEditingWorkflow] = useState<{
    name: string;
    description: string;
    entity_type: string;
    is_default: boolean;
    is_active: boolean;
  }>({
    name: '',
    description: '',
    entity_type: 'claim',
    is_default: false,
    is_active: true,
  });
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);
  const [nodeForm, setNodeForm] = useState({
    label: '',
    nodeType: 'approval' as WorkflowNodeData['nodeType'],
    approverRole: '',
    condition: '',
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/workflows');
      const data = await res.json();
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );

  const addNode = (type: WorkflowNodeData['nodeType']) => {
    const id = `${type}-${Date.now()}`;
    const newNode: Node<WorkflowNodeData> = {
      id,
      type: 'custom',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: type === 'approval' ? 'New Approval' : type === 'action' ? 'New Action' : type === 'condition' ? 'Condition' : type === 'end' ? 'End' : 'Start',
        nodeType: type,
        approverRole: type === 'approval' ? 'Manager' : undefined,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const deleteSelectedNode = () => {
    if (selectedNode && selectedNode.id !== 'start' && selectedNode.id !== 'end') {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    }
  };

  const handleSaveWorkflow = async () => {
    try {
      const workflowData = {
        name: editingWorkflow.name,
        description: editingWorkflow.description,
        entity_type: editingWorkflow.entity_type,
        is_default: editingWorkflow.is_default,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.nodeType,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
      };

      if (selectedWorkflow) {
        await fetch(`/api/workflows/${selectedWorkflow.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...workflowData, is_active: editingWorkflow.is_active }),
        });
      } else {
        await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflowData),
        });
      }

      fetchWorkflows();
      alert('Workflow saved successfully!');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
    }
  };

  const handleLoadWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setShowWorkflowList(false);
    
    const workflowNodes = JSON.parse(workflow.nodes);
    const workflowEdges = JSON.parse(workflow.edges);
    
    setNodes(workflowNodes.map((n: any) => ({
      ...n,
      type: 'custom',
      data: n.data || { label: n.label, nodeType: n.type },
    })));
    setEdges(workflowEdges.map((e: any) => ({
      ...e,
      markerEnd: { type: MarkerType.ArrowClosed },
    })));
    
    setEditingWorkflow({
      name: workflow.name,
      description: workflow.description || '',
      entity_type: workflow.entity_type,
      is_default: workflow.is_default === 1,
      is_active: workflow.is_active === 1,
    });
  };

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node as Node<WorkflowNodeData>);
    setNodeForm({
      label: node.data.label,
      nodeType: node.data.nodeType,
      approverRole: node.data.approverRole || '',
      condition: node.data.condition || '',
    });
    setShowNodeModal(true);
  };

  const updateNodeData = () => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNode.id
            ? {
                ...n,
                data: {
                  ...n.data,
                  label: nodeForm.label,
                  nodeType: nodeForm.nodeType,
                  approverRole: nodeForm.approverRole || undefined,
                  condition: nodeForm.condition || undefined,
                },
              }
            : n
        )
      );
      setShowNodeModal(false);
    }
  };

  const createNewWorkflow = () => {
    setSelectedWorkflow(null);
    setShowWorkflowList(false);
    setNodes(initialNodes);
    setEdges(initialEdges);
    setEditingWorkflow({
      name: '',
      description: '',
      entity_type: 'claim',
      is_default: false,
      is_active: true,
    });
  };

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Workflow Configuration</h2>
          <p className="text-slate-500 mt-1">Design and manage approval workflows for your business processes.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWorkflowList(true)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
          >
            Workflows
          </button>
          <button
            onClick={createNewWorkflow}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        </div>
      </div>

      {showWorkflowList ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleLoadWorkflow(workflow)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{workflow.name}</h3>
                  <p className="text-sm text-slate-500">{workflow.description || 'No description'}</p>
                </div>
                <div className="flex gap-1">
                  {workflow.is_default === 1 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      Default
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      workflow.is_active === 1
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {workflow.is_active === 1 ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {workflow.entity_type}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Workflow Name</label>
                <input
                  type="text"
                  value={editingWorkflow.name}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Expense Approval"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Entity Type</label>
                <select
                  value={editingWorkflow.entity_type}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, entity_type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="claim">Claim</option>
                  <option value="request">Request</option>
                  <option value="invoice">Invoice</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">Description</label>
                <input
                  type="text"
                  value={editingWorkflow.description}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe this workflow..."
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingWorkflow.is_default}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, is_default: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Set as default</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingWorkflow.is_active}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Active</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-semibold text-slate-700">Add Node:</span>
              <button
                onClick={() => addNode('approval')}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <User className="w-3 h-3" /> Approval
              </button>
              <button
                onClick={() => addNode('action')}
                className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors flex items-center gap-1"
              >
                <Settings className="w-3 h-3" /> Action
              </button>
              <button
                onClick={() => addNode('condition')}
                className="px-3 py-1.5 bg-yellow-50 text-yellow-600 rounded-lg text-xs font-medium hover:bg-yellow-100 transition-colors flex items-center gap-1"
              >
                <Circle className="w-3 h-3" /> Condition
              </button>
              <button
                onClick={deleteSelectedNode}
                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1 ml-auto"
              >
                <Trash2 className="w-3 h-3" /> Delete Selected
              </button>
            </div>

            <div className="h-[500px] border border-slate-200 rounded-lg overflow-hidden">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
              >
                <Controls />
                <Background />
              </ReactFlow>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveWorkflow}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
            >
              <Save className="w-4 h-4" />
              Save Workflow
            </button>
          </div>
        </div>
      )}

      {showNodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Edit Node</h3>
              <button
                onClick={() => setShowNodeModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Label</label>
                <input
                  type="text"
                  value={nodeForm.label}
                  onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Node Type</label>
                <select
                  value={nodeForm.nodeType}
                  onChange={(e) => setNodeForm({ ...nodeForm, nodeType: e.target.value as WorkflowNodeData['nodeType'] })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="approval">Approval</option>
                  <option value="action">Action</option>
                  <option value="condition">Condition</option>
                </select>
              </div>
              {nodeForm.nodeType === 'approval' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Approver Role</label>
                  <input
                    type="text"
                    value={nodeForm.approverRole}
                    onChange={(e) => setNodeForm({ ...nodeForm, approverRole: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Manager, Finance Lead"
                  />
                </div>
              )}
              {nodeForm.nodeType === 'condition' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Condition</label>
                  <input
                    type="text"
                    value={nodeForm.condition}
                    onChange={(e) => setNodeForm({ ...nodeForm, condition: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., amount > 1000"
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowNodeModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={updateNodeData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Update Node
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
