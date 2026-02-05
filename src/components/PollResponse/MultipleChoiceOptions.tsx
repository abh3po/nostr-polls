import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import { TextWithImages } from "../Common/Parsers/TextWithImages";

interface MultipleChoiceOptionsProps {
  options: Array<[string, string, string]>;
  response: string[];
  handleResponseChange: (value: string) => void;
  tags?: string[][];
}

export const MultipleChoiceOptions: React.FC<MultipleChoiceOptionsProps> = ({
  options,
  response,
  handleResponseChange,
  tags,
}) => (
  <FormGroup>
    {options.map((option) => (
      <FormControlLabel
        key={option[1]}
        control={<Checkbox />}
        label={<TextWithImages content={option[2]} tags={tags} />}
        value={option[1]}
        className="radio-label"
        checked={response.includes(option[1])}
        onChange={() => handleResponseChange(option[1])}
      />
    ))}
  </FormGroup>
);
