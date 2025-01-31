import { ReactNode } from 'react';

import { BusEventWithPayload, RegistryItem } from '@grafana/data';
import { SceneObject, VizPanel } from '@grafana/scenes';
import { OptionsPaneCategoryDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneCategoryDescriptor';
import { OptionsPaneItemDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneItemDescriptor';

/**
 * A scene object that usually wraps an underlying layout
 * Dealing with all the state management and editing of the layout
 */
export interface DashboardLayoutManager extends SceneObject {
  /** Marks it as a DashboardLayoutManager */
  isDashboardLayoutManager: true;

  /**
   * Gets the layout descriptor (which has the name and id)
   */
  getDescriptor(): LayoutRegistryItem;

  /**
   * Adds a new panel to the layout
   */
  addPanel(panel: VizPanel): void;

  /**
   * Remove an element / panel
   * @param panel
   */
  removePanel(panel: VizPanel): void;

  /**
   * Creates a copy of an existing element and adds it to the layout
   * @param panel
   */
  duplicatePanel(panel: VizPanel): void;

  /**
   * getVizPanels
   */
  getVizPanels(): VizPanel[];

  /**
   * Returns the highest panel id in the layout
   */
  getMaxPanelId(): number;

  /**
   * Add tab
   */
  addNewTab(): void;

  /**
   * Add row
   */
  addNewRow(): void;

  /**
   * Notify the layout manager that the edit mode has changed
   * @param isEditing
   */
  editModeChanged?(isEditing: boolean): void;

  /**
   * Turn into a save model
   */
  toSaveModel?(): any;

  /**
   * For dynamic panels that need to be viewed in isolation (SoloRoute)
   */
  activateRepeaters?(): void;

  /**
   * Renders options and layout actions
   */
  getOptions?(): OptionsPaneItemDescriptor[];

  /**
   * Create a clone of the layout manager given an ancestor key
   * @param ancestorKey
   * @param isSource
   */
  cloneLayout?(ancestorKey: string, isSource: boolean): DashboardLayoutManager;
}

export function isDashboardLayoutManager(obj: SceneObject): obj is DashboardLayoutManager {
  return 'isDashboardLayoutManager' in obj;
}

/**
 * The layout descriptor used when selecting / switching layouts
 */
export interface LayoutRegistryItem extends RegistryItem {
  /**
   * When switching between layouts
   * @param currentLayout
   */
  createFromLayout(currentLayout: DashboardLayoutManager): DashboardLayoutManager;
  /**
   * Create from persisted state
   * @param saveModel
   */
  createFromSaveModel?(saveModel: any): void;
}

/**
 * This interface is needed to support layouts existing on different levels of the scene (DashboardScene and inside the TabsLayoutManager)
 */
export interface LayoutParent extends SceneObject {
  switchLayout(newLayout: DashboardLayoutManager): void;
}

export function isLayoutParent(obj: SceneObject): obj is LayoutParent {
  return 'switchLayout' in obj;
}

/**
 * Abstraction to handle editing of different layout elements (wrappers for VizPanels and other objects)
 * Also useful to when rendering / viewing an element outside it's layout scope
 */
export interface DashboardLayoutItem extends SceneObject {
  /**
   * Marks this object as a layout item
   */
  isDashboardLayoutItem: true;

  /**
   * Return layout item options (like repeat, repeat direction, etc for the default DashboardGridItem)
   */
  getOptions?(): OptionsPaneCategoryDescriptor;

  /**
   * When going into panel edit
   **/
  editingStarted?(): void;

  /**
   * When coming out of panel edit
   */
  editingCompleted?(withChanges: boolean): void;
}

export function isDashboardLayoutItem(obj: SceneObject): obj is DashboardLayoutItem {
  return 'isDashboardLayoutItem' in obj;
}

export interface DashboardRepeatsProcessedEventPayload {
  source: SceneObject;
}

export class DashboardRepeatsProcessedEvent extends BusEventWithPayload<DashboardRepeatsProcessedEventPayload> {
  public static type = 'dashboard-repeats-processed';
}

/**
 * Interface for elements that have options
 */
export interface EditableDashboardElement {
  /**
   * Marks this object as an element that can be selected and edited directly on the canvas
   */
  isEditableDashboardElement: true;

  /**
   * The type name of the element
   */
  typeName: Readonly<string>;

  /**
   * Hook that returns edit pane options
   */
  useEditPaneOptions(): OptionsPaneCategoryDescriptor[];

  /**
   * Panel Actions
   **/
  renderActions?(): ReactNode;
}

export function isEditableDashboardElement(obj: object): obj is EditableDashboardElement {
  return 'isEditableDashboardElement' in obj;
}
