import { useEffect, useState } from "react";
import { ValidationError } from "yup";
import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Box,
  Stack,
} from "@chakra-ui/react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import {
  ChangeHandlers,
  RoundApplicationMetadata,
  ProjectOption,
  Round,
  DynamicFormInputs,
} from "../../types";
import {
  Select,
  TextArea,
  TextInput,
  TextInputAddress,
} from "../grants/inputs";
import { validateApplication } from "../base/formValidation";
import Radio from "../grants/Radio";
import Button, { ButtonVariants } from "../base/Button";
import { RootState } from "../../reducers";
import { loadProjects } from "../../actions/projects";
import { submitApplication } from "../../actions/roundApplication";
import { isValidAddress } from "../../utils/wallet";

const validation = {
  message: "",
  valid: false,
};

export default function Form({
  roundApplication,
  round,
}: {
  roundApplication: RoundApplicationMetadata;
  round: Round;
}) {
  const dispatch = useDispatch();

  const [formInputs, setFormInputs] = useState<DynamicFormInputs>({});
  const [submitted, setSubmitted] = useState(false);
  const [preview, setPreview] = useState(false);
  const [formValidation, setFormValidation] = useState(validation);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>();
  const [displayAddressError, setDisplayAddressError] = useState("invisible");
  const [showProjectDetails] = useState(true);
  const [selectedProjectID, setSelectedProjectID] = useState<
    string | undefined
  >(undefined);

  const props = useSelector((state: RootState) => {
    const allProjectMetadata = state.grantsMetadata;
    let selectedProjectMetadata;
    if (selectedProjectID !== undefined && selectedProjectID !== "") {
      selectedProjectMetadata =
        allProjectMetadata[Number(selectedProjectID)]?.metadata;
    }

    return {
      projects: state.projects.projects,
      allProjectMetadata,
      selectedProjectMetadata,
    };
  }, shallowEqual);

  const schema = roundApplication.applicationSchema;

  const handleInput = (e: ChangeHandlers) => {
    const { value } = e.target;
    setFormInputs({ ...formInputs, [e.target.name]: value });
  };

  const handleProjectInput = (e: ChangeHandlers) => {
    const { value } = e.target;
    setSelectedProjectID(value);
    handleInput(e);
  };

  const handleInputAddress = async (e: ChangeHandlers) => {
    const { value } = e.target;
    const isValid = isValidAddress(value);
    if (!isValid) {
      setDisplayAddressError("visible");
    } else {
      setDisplayAddressError("invisible");
    }

    setFormInputs({ ...formInputs, [e.target.name]: value });
  };

  const validate = async () => {
    try {
      await validateApplication(schema, formInputs);
      setFormValidation({
        message: "",
        valid: true,
      });
    } catch (e) {
      const error = e as ValidationError;
      setFormValidation({
        message: error.message,
        valid: false,
      });
    }
  };

  const handleSubmitApplication = async () => {
    setSubmitted(true);
    await validate();
    if (formValidation.valid) {
      dispatch(submitApplication(round.address, formInputs));
    }
  };

  // perform validation after the fields state is updated
  useEffect(() => {
    validate();
    console.log("isSafe", formInputs.isSafe);
  }, [formInputs]);

  useEffect(() => {
    dispatch(loadProjects(true));
  }, [dispatch]);

  useEffect(() => {
    const currentOptions = props.projects.map(
      (project): ProjectOption => ({
        id: project.id,
        title: props.allProjectMetadata[project.id].metadata?.title,
      })
    );
    currentOptions.unshift({ id: undefined, title: "" });

    setProjectOptions(currentOptions);
  }, [props.allProjectMetadata]);

  const recipientAddressInput =
    schema.find((item) => item.type === "RECIPIENT") ?? undefined;
  const projectSelect =
    schema.find((item) => item.type === "PROJECT") ?? undefined;

  useEffect(() => {
    // todo: this is a hack to get the project details to show up
  }, [formInputs]);

  return (
    <div className="border-0 sm:border sm:border-solid border-tertiary-text rounded text-primary-text p-0 sm:p-4">
      <form onSubmit={(e) => e.preventDefault()}>
        <hr />
        {schema.map((input) => {
          switch (input.type) {
            case "PROJECT":
              return (
                <>
                  <Select
                    key={projectSelect?.id}
                    name={`${projectSelect?.id}`}
                    label={projectSelect?.question ?? ""}
                    options={projectOptions ?? []}
                    disabled={preview}
                    changeHandler={handleProjectInput}
                  />
                  {showProjectDetails && props.selectedProjectMetadata && (
                    <Accordion className="w-1/2 mt-4" allowToggle>
                      <AccordionItem>
                        <h2>
                          <AccordionButton>
                            <Box flex="1" textAlign="left">
                              Project Details (
                              {props.selectedProjectMetadata.title})
                            </Box>
                          </AccordionButton>
                        </h2>
                        <AccordionPanel pb={4}>
                          {/* <Details
                  project={props.roundApplication.project}}
                  bannerImg=""
                  logoImg=""
                  updatedAt=""
                  key={projectSelect?.id}
                /> */}
                        </AccordionPanel>
                      </AccordionItem>
                    </Accordion>
                  )}
                </>
              );
            case "TEXT":
              return (
                <TextInput
                  key={input.id}
                  label={input.question}
                  placeholder={input.info}
                  name={`${input.id}`}
                  value={formInputs[`${input.id}`] ?? ""}
                  disabled={preview}
                  changeHandler={handleInput}
                />
              );
            case "RECIPIENT":
              /* Radio for safe or multi-sig */
              return (
                <>
                  <div className="relative mt-2">
                    <Stack>
                      <Radio
                        label="Is your payout wallet a Gnosis Safe or multi-sig?"
                        choices={["Yes", "No"]}
                        changeHandler={handleInput}
                        name="isSafe"
                        value={formInputs.isSafe ?? ""}
                        info=""
                      />
                    </Stack>
                  </div>
                  <TextInputAddress
                    key={recipientAddressInput?.id}
                    label={
                      recipientAddressInput?.question ?? "Payout Wallet Address"
                    }
                    placeholder={recipientAddressInput?.info}
                    name={`${recipientAddressInput?.id}`}
                    tooltipValue="Please make sure the payout address you provide is a valid address that you own on the Optimism network.
          If you provide the address for a gnosis SAFE or other multisig, please confirm the multisig is deployed to Optimism,
          and not simply a multisig you own on L1. Optimism will send a test transaction and require you send it back before
          sending the balance of any full grant."
                    value={formInputs[`${recipientAddressInput?.id}`] ?? ""}
                    disabled={preview}
                    changeHandler={handleInputAddress}
                    displayError={displayAddressError}
                  />
                  <p className="text-xs mt-4 mb-1">
                    To complete your application to {round.roundMetadata.name},
                    a little more info is needed:
                  </p>
                </>
              );
            case "TEXTAREA":
              return (
                <TextArea
                  key={input.id}
                  label={input.question}
                  placeholder={input.info}
                  name={`${input.id}`}
                  value={formInputs[`${input.id}`] ?? ""}
                  disabled={preview}
                  changeHandler={handleInput}
                />
              );
            case "RADIO":
              return (
                <Radio
                  key={input.id}
                  label={input.question}
                  name={`${input.id}`}
                  value={
                    formInputs[`${input.id}`] ??
                    (input.choices && input.choices[0])
                  }
                  choices={input.choices}
                  disabled={preview}
                  changeHandler={handleInput}
                />
              );
            // case "MULTIPLE":
            // placeholder until we support multiple input
            //   return (
            //     <Radio
            //       label={appInput.question}
            //       name={id}
            //       info={appInput.info}
            //       choices={appInput.choices}
            //       changeHandler={(e) => console.log(e)}
            //     />
            //   );
            default:
              return (
                <TextInput
                  key={input.id}
                  label={input.question}
                  placeholder={input.info}
                  name={`${input.id}`}
                  value={formInputs[`${input.id}`] ?? ""}
                  disabled={preview}
                  changeHandler={handleInput}
                />
              );
          }
        })}
        {!formValidation.valid && submitted && (
          <p className="text-danger-text w-full text-center font-semibold my-2">
            {formValidation.message}
          </p>
        )}
        <div className="flex justify-end">
          {!preview ? (
            <Button
              disabled={!formValidation.valid}
              variant={ButtonVariants.primary}
              onClick={() => setPreview(true)}
            >
              Preview Application
            </Button>
          ) : (
            <div className="flex justify-end">
              <Button
                variant={ButtonVariants.outline}
                onClick={() => setPreview(false)}
              >
                Back to Editing
              </Button>
              <Button
                variant={ButtonVariants.primary}
                onClick={handleSubmitApplication}
              >
                Submit
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
