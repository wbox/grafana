import { cx } from '@emotion/css';
import { useRef } from 'react';
import Draggable from 'react-draggable';
import { useLocation } from 'react-router';

import { locationUtil, textUtil } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { SceneComponentProps, sceneGraph } from '@grafana/scenes';
import { Tab, useElementSelection } from '@grafana/ui';

import { useDashboardState } from '../../utils/utils';

import { TabItem } from './TabItem';

export function TabItemRenderer({ model }: SceneComponentProps<TabItem>) {
  const { title, key } = model.useState();
  const parentLayout = model.getParentLayout();
  const { draggedTab, tabs, currentTabIndex } = parentLayout.useState();
  const titleInterpolated = sceneGraph.interpolate(model, title, undefined, 'text');
  const { isSelected, onSelect, isSelectable } = useElementSelection(key);
  const myIndex = tabs.findIndex((tab) => tab === model);
  const isActive = myIndex === currentTabIndex;
  const location = useLocation();
  const href = textUtil.sanitize(locationUtil.getUrlForPartial(location, { tab: myIndex }));
  const draggableRef = useRef(null);
  const tabRef = useRef(null);
  const { isEditing } = useDashboardState(model);
  const dragPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  console.log(draggableRef.current);

  return (
    <Draggable
      ref={draggableRef}
      nodeRef={tabRef}
      axis="x"
      disabled={!isEditing}
      bounds="parent"
      position={{ x: 0, y: 0 }}
      allowAnyClick={true}
      onStart={(evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        parentLayout.startDrag(model);
      }}
      onDrag={(_evt, data) => {
        dragPos.current = {
          x: dragPos.current.x + Math.abs(data.deltaX),
          y: dragPos.current.y + Math.abs(data.deltaY),
        };
      }}
      onStop={(evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        dragPos.current = { x: 0, y: 0 };

        if (dragPos.current.x > 10 || dragPos.current.y > 10) {
          parentLayout.endDrag();
          return;
        }

        if (!isActive) {
          locationService.push(href);
        }

        // onSelect?.();
      }}
    >
      <Tab
        ref={tabRef}
        truncate
        data-drop-target={key}
        className={cx(
          isSelected && 'dashboard-selected-element',
          isSelectable && !isSelected && 'dashboard-selectable-element'
        )}
        // This should be kept here as opposed to being moved into a CSS class
        // It prevents the element from jumping left-right
        style={draggedTab === model ? { pointerEvents: 'none', zIndex: 1000 } : undefined}
        active={isActive}
        role="presentation"
        title={titleInterpolated}
        href={href}
        aria-selected={isActive}
        onMouseEnter={draggedTab && draggedTab !== model ? () => parentLayout.moveTab(model) : undefined}
        label={titleInterpolated}
      />
    </Draggable>
  );
}
