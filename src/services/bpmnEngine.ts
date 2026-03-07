import BpmnEngine from 'bpmn-engine';
import { EventEmitter } from 'events';

interface Node {
  id: string;
  type: string;
  label: string;
  position?: { x: number; y: number };
  data?: {
    approverRole?: string;
    approverDepartment?: string;
    approverUserId?: string;
  };
}

interface Edge {
  id: string;
  source: string;
  target: string;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
}

export class BpmnWorkflowEngine extends EventEmitter {
  private engines: Map<string, any> = new Map();

  convertToBpmnXml(workflow: WorkflowDefinition): string {
    const { nodes, edges } = workflow;
    
    const sequenceFlows = edges.map((edge, index) => `
      <sequenceFlow id="${edge.id}" sourceRef="${edge.source}" targetRef="${edge.target}">
        <conditionExpression xsi:type="tFormalExpression" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">true</conditionExpression>
      </sequenceFlow>
    `).join('');

    const tasks = nodes
      .filter(node => node.type === 'approval' || node.type === 'action')
      .map(node => {
        const isServiceTask = node.type === 'action';
        return `
        <${isServiceTask ? 'serviceTask' : 'userTask'} id="${node.id}" name="${node.label}">
          <documentation>${node.label}</documentation>
          ${node.data?.approverRole ? `<camunda:inputOutput><camunda:inputParameter name="approverRole">${node.data.approverRole}</camunda:inputParameter></camunda:inputOutput>` : ''}
        </${isServiceTask ? 'serviceTask' : 'userTask'}>`;
      })
      .join('');

    const startEvent = nodes.find(n => n.type === 'start');
    const endEvents = nodes.filter(n => n.type === 'end');

    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="Definitions_${workflow.id}" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_${workflow.id}" isExecutable="true">
    ${startEvent ? `<startEvent id="${startEvent.id}" name="${startEvent.label}">
      <outgoing>flow_start</outgoing>
    </startEvent>` : ''}
    
    ${tasks}
    
    ${sequenceFlows}
    
    ${endEvents.map((end, i) => `
    <endEvent id="${end.id}" name="${end.label}">
      <ingoing>flow_${i}</ingoing>
    </endEvent>`).join('')}
    
    ${startEvent && nodes.length > 0 ? `<sequenceFlow id="flow_start" sourceRef="${startEvent.id}" targetRef="${nodes[1]?.id || nodes[0].id}">` : ''}
  </bpmn:process>
  
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_${workflow.id}">
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
  }

  async startProcess(workflowXml: string, variables: Record<string, any> = {}) {
    const engine = new BpmnEngine({
      name: 'workflow',
      moddleOptions: {
        camunda: 'http://camunda.org/schema/1.0/bpmn'
      }
    });

    const listener = new EventEmitter();
    
    engine.execute({
      variables,
      extensions: {
        saveOutput: (context: any) => {
          listener.emit('activity.start', context);
        }
      }
    });

    return new Promise((resolve, reject) => {
      engine.once('end', (execution) => {
        resolve({
          state: execution.state,
          variables: execution.variables,
          output: execution.output
        });
      });

      engine.once('error', (err) => {
        reject(err);
      });
    });
  }

  async approveTask(engineInstance: any, taskId: string, variables: Record<string, any> = {}) {
    const engine = engineInstance;
    
    return new Promise((resolve, reject) => {
      engine.once('end', (execution) => {
        resolve({
          state: execution.state,
          variables: execution.variables
        });
      });

      engine.once('error', reject);
    });
  }

  getEngineInstance(processId: string): any {
    return this.engines.get(processId);
  }

  setEngineInstance(processId: string, instance: any): void {
    this.engines.set(processId, instance);
  }

  removeEngineInstance(processId: string): void {
    this.engines.delete(processId);
  }
}

export const bpmnEngine = new BpmnWorkflowEngine();

export function createApprovalWorkflowXml(workflowName: string, steps: { label: string; approverRole?: string }[]): string {
  const processId = `claim_${Date.now()}`;
  
  let bpmnElements = '';
  let sequenceFlows = '';
  let prevId = 'start';

  bpmnElements += `<startEvent id="start" name="Submit Claim">
    <outgoing>flow_0</outgoing>
  </startEvent>`;

  steps.forEach((step, index) => {
    const taskId = `task_${index}`;
    const isLastStep = index === steps.length - 1;
    
    bpmnElements += `<userTask id="${taskId}" name="${step.label}">
      <incoming>flow_${index}</incoming>
      <outgoing>flow_${index + 1}</outgoing>
    </userTask>`;

    if (step.approverRole) {
      bpmnElements += `
      <sequenceFlow id="flow_${index}" sourceRef="${prevId}" targetRef="${taskId}">
        <conditionExpression xsi:type="tFormalExpression" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">true</conditionExpression>
      </sequenceFlow>`;
    } else {
      sequenceFlows += `
      <sequenceFlow id="flow_${index}" sourceRef="${prevId}" targetRef="${taskId}">
      </sequenceFlow>`;
    }
    
    prevId = taskId;
  });

  bpmnElements += `<endEvent id="end" name="Complete">
    <incoming>flow_${steps.length}</incoming>
  </endEvent>
  <sequenceFlow id="flow_${steps.length}" sourceRef="${prevId}" targetRef="end">
  </sequenceFlow>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_${processId}" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${processId}" name="${workflowName}" isExecutable="true">
    ${bpmnElements}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}
