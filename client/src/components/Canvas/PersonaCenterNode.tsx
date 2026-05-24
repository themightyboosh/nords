/**
 * PersonaCenterNode — Avatar node placed at the center of the radial heatmap.
 *
 * Renders the active persona's avatar as a circular node at position (0,0).
 * This is the gravitational center of the persona lens layout.
 * Non-interactive — purely a visual anchor.
 */

import React, { memo, useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { notionists } from '@dicebear/collection';
import type { NodeProps, Node } from '@xyflow/react';

interface PersonaCenterData {
  avatarSeed: string;
  accentColor: string;
  name: string;
}

export type PersonaCenterNodeType = Node<PersonaCenterData, 'personaCenter'>;

export const PersonaCenterNode = memo(({ data }: NodeProps<PersonaCenterNodeType>) => {
  const avatarUri = useMemo(() => {
    return createAvatar(notionists, { seed: data.avatarSeed || 'default', size: 240 }).toDataUri();
  }, [data.avatarSeed]);

  return (
    <div className="persona-center-node">
      <div
        className="persona-center-node__ring"
        style={{ borderColor: data.accentColor || '#3d4f7c' }}
      >
        <img
          src={avatarUri}
          alt={data.name}
          className="persona-center-node__avatar"
          style={{ backgroundColor: data.accentColor || '#3d4f7c' }}
        />
      </div>
      <span className="persona-center-node__label">{data.name}</span>
    </div>
  );
});

export default PersonaCenterNode;
