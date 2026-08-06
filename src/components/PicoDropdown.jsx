import { createSignal, For} from "solid-js";

export const PicoDropdown = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);

  const displayLabel = () =>
    props.value !== undefined && props.value !== null
      ? String(props.value)
      : props.placeholder ?? "Select an option...";

  const handleSelect = (e, val) => {
    e.preventDefault();
    setIsOpen(false);
    props.onChange(val);
  };

  return (
    <details
      class="dropdown"
      open={isOpen()}
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
    >
      <summary aria-haspopup="listbox">
        {displayLabel()}
      </summary>
      <ul role="listbox">
        <For each={props.options}>
          {(option) => (
            <li>
              <a
                href="#"
                aria-selected={option === props.value}
                onClick={(e) => handleSelect(e, option)}
              >
                {option}
              </a>
            </li>
          )}
        </For>
      </ul>
    </details>
  );
}
