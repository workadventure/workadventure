<script lang="ts">
    import type { SeatPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import Select from "../../Input/Select.svelte";
    import { IconArmchair } from "../../Icons";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    interface Props {
        property: SeatPropertyData;
        /** On an area, the seat covers a chair painted in the map rather than an object. */
        isArea?: boolean;
        onchange?: () => void;
        onclose?: () => void;
    }

    let { property = $bindable(), isArea = false, onchange, onclose }: Props = $props();

    const directionOptions = $derived([
        { value: "down", label: $LL.mapEditor.properties.seat.directions.down() },
        { value: "up", label: $LL.mapEditor.properties.seat.directions.up() },
        { value: "left", label: $LL.mapEditor.properties.seat.directions.left() },
        { value: "right", label: $LL.mapEditor.properties.seat.directions.right() },
    ]);

    function onSeatsChange(): void {
        // An emptied number input is bound to null: fall back to a single place.
        const seats = Math.round(Number(property.seats));
        property.seats = Number.isFinite(seats) ? Math.min(8, Math.max(1, seats)) : 1;
        onchange?.();
    }
</script>

<PropertyEditorBase
    onclose={() => {
        onclose?.();
    }}
>
    {#snippet header()}
        <span class="flex justify-center items-center">
            <IconArmchair font-size="18" class="mr-2" />
            {$LL.mapEditor.properties.seat.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <div class="flex flex-col gap-2">
            <p class="text-sm opacity-70 m-0">
                {isArea ? $LL.mapEditor.properties.seat.areaHint() : $LL.mapEditor.properties.seat.description()}
            </p>
            <Select
                id="seatDirection"
                label={$LL.mapEditor.properties.seat.directionLabel()}
                options={directionOptions}
                bind:value={property.direction}
                onchange={() => onchange?.()}
            />
            <Input
                id="seatCount"
                type="number"
                min={1}
                max={8}
                step={1}
                label={$LL.mapEditor.properties.seat.seatsLabel()}
                bind:value={property.seats}
                onchange={onSeatsChange}
            />
        </div>
    {/snippet}
</PropertyEditorBase>
