import { describe, it, expect } from 'vitest';
import {
  MATRIX_NODES,
  MATRIX_EDGES,
  MATRIX_COLUMNS,
  getConnectedNodes,
  getActiveEdgesForNode,
} from './matrixData';

describe('matrixData relational integrity', () => {
  it('defines the 4 canonical columns', () => {
    expect(MATRIX_COLUMNS.map((c) => c.id)).toEqual(['actors', 'events', 'systems', 'regulations']);
  });

  it('has unique IDs across all nodes', () => {
    const ids = MATRIX_NODES.map((n) => n.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('every node belongs to a valid column', () => {
    const validCols = new Set(['actors', 'events', 'systems', 'regulations']);
    for (const node of MATRIX_NODES) {
      expect(validCols.has(node.column)).toBe(true);
      expect(node.titleDa.length).toBeGreaterThan(0);
      expect(node.descriptionDa.length).toBeGreaterThan(0);
    }
  });

  it('every edge connects existing source and target nodes', () => {
    const nodeIds = new Set(MATRIX_NODES.map((n) => n.id));
    for (const edge of MATRIX_EDGES) {
      expect(nodeIds.has(edge.sourceId), `Unknown sourceId: ${edge.sourceId}`).toBe(true);
      expect(nodeIds.has(edge.targetId), `Unknown targetId: ${edge.targetId}`).toBe(true);
      expect([2026, 2028]).toContain(edge.yearValidFrom);
    }
  });

  it('filters 2028 edges when year is 2026', () => {
    // actor_micro has eLog edge valid from 2028
    const connected2026 = getConnectedNodes('actor_micro', 2026);
    const connected2028 = getConnectedNodes('actor_micro', 2028);

    // In 2028, actor_micro connects to eLog and VMS
    expect(connected2028.has('sys_elog')).toBe(true);
    expect(connected2028.has('sys_fos_vms')).toBe(true);

    // In 2026, actor_micro does not have eLog or VMS connections
    expect(connected2026.has('sys_elog')).toBe(false);
    expect(connected2026.has('sys_fos_vms')).toBe(false);
  });

  it('traverses multi-hop connections to bridge all 4 columns for FOS', () => {
    const connected = getConnectedNodes('sys_fos_sales', 2026);
    // Should connect to events (first_sale, weighing, license)
    expect(connected.has('evt_first_sale')).toBe(true);
    // Should connect to regulations (reg_1224_2009, reg_bek_1144_landing)
    expect(connected.has('reg_1224_2009')).toBe(true);
    // Should connect back to actors (buyer)
    expect(connected.has('actor_buyer')).toBe(true);
  });

  it('getActiveEdgesForNode returns valid edge subsets', () => {
    const edges = getActiveEdgesForNode('actor_medium', 2026);
    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      expect(edge.yearValidFrom).toBeLessThanOrEqual(2026);
    }
  });
});
