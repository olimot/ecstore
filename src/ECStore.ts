/* eslint-disable no-param-reassign,@typescript-eslint/no-non-null-assertion */

export default class ECStore<TEntity extends object & { id: string }> {
  entities: Record<string, Partial<TEntity>>;

  components: Record<keyof TEntity, Partial<TEntity>[]>;

  constructor() {
    this.components = {} as Record<keyof TEntity, Partial<TEntity>[]>;

    const entitiesData: Record<string, TEntity> = {};
    this.entities = new Proxy(entitiesData, {
      get: (entities, id: string) => {
        let entityProxy = entities[id];
        if (!entityProxy) {
          entityProxy = new Proxy({ id } as unknown as TEntity, {
            set: (<Key extends keyof TEntity>(target: TEntity, key: Key, value: TEntity[Key]) => {
              if (key === 'id') return false;
              if (value === undefined) {
                if (this.components[key]) {
                  const index = this.components[key]!.indexOf(entityProxy);
                  if (index !== -1) this.components[key]!.splice(index, 1);
                }
                delete target[key];
              } else {
                if (!this.components[key]) this.components[key] = [];
                const index = this.components[key]!.indexOf(entityProxy);
                if (index === -1) this.components[key]!.push(entityProxy);

                target[key] = value;
              }
              return true;
            }) as (target: TEntity, propertyKey: string | symbol, value: unknown, receiver: unknown) => boolean,
            deleteProperty: (<Key extends keyof TEntity>(object: TEntity, key: Key) => {
              if (this.components[key]) {
                const index = this.components[key]!.indexOf(entityProxy);
                if (index !== -1) this.components[key]!.splice(index, 1);
              }
              delete object[key];
              return true;
            }) as (target: TEntity, p: string | symbol) => boolean,
          });

          entities[id] = entityProxy;
        }
        return entityProxy;
      },

      set: (_, id: string, entity: Record<keyof TEntity, TEntity[keyof TEntity] | null>) => {
        const entityProxy = this.entities[id];

        Object.keys(entity).forEach(((key: keyof TEntity) => {
          if (key === 'id') return;
          const value = entity[key] as TEntity[keyof TEntity];
          if (value === null) delete entityProxy[key];
          else entityProxy[key] = value;
        }) as ($0: string) => void);

        return true;
      },

      deleteProperty: (entityData, id: string) => {
        if (!(id in this.entities)) return false;
        const entityDatum = entityData[id];
        Object.keys(entityDatum).forEach((<Key extends keyof TEntity>(key: Key) => {
          if (this.components[key]) {
            const index = this.components[key]!.indexOf(entityDatum);
            if (index !== -1) this.components[key]!.splice(index, 1);
          }
        }) as ($0: string) => void);
        delete entityData[id];
        return true;
      },
    });
  }

  addCount = 0;

  add(...entities: Partial<TEntity>[]) {
    const ids: string[] = [];
    if (!entities.length) return ids;
    if (entities.length === 1) {
      const id = (entities[0] as unknown as { id: string }).id || `auto-generated ${this.addCount}`;
      ids.push(id);
      this.entities[id] = { ...entities[0] };
    } else {
      for (let i = 0; i < entities.length; i += 1) {
        const id = (entities[i] as unknown as { id: string }).id || `auto-generated ${this.addCount}.${i}`;
        ids.push(id);
        this.entities[id] = { ...entities[i] };
      }
    }
    this.addCount += 1;
    return ids;
  }

  delete(...entities: Partial<TEntity>[]) {
    const out: Partial<TEntity>[] = [];
    for (let i = 0; i < entities.length; i += 1) {
      out.push({ ...entities[i] });
      const { id } = entities[i] as unknown as { id: string };
      if (id && this.entities[id]) delete this.entities[id];
    }
    return out;
  }
}
